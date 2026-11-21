import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { evaluateHotelSendReadiness } from "@/lib/epoch-ai/hotelSendReadiness";
import { formatHotelInquiryEmail } from "@/lib/epoch-ai/hotelInquiryEmailFormat";
import { sendEmail } from "@/lib/email/sendEmail";
import { reviewSupplierSend, supplierEventKey, SUPPLIER_SEND_ENABLED, SUPPLIER_CC, supplierSendSnapshot, validateSupplierSendConfirmation } from "@/lib/epoch-ai/hotelSupplierSendSafety";
import { isAuthorizedTestDatabase } from "@/lib/epoch-ai/hotelTestEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (obj: Record<string, unknown>, status=200) => NextResponse.json(obj, {status, headers:{"Cache-Control":"no-store"}});

type InquiryIdParams={params:Promise<{id:string}>};
async function getReview(id:string){
 const entry=await db.hotelInquiry.findUnique({where:{id},select:{id:true,tourId:true,supplierId:true,destination:true,checkIn:true,checkOut:true,rooms:true,status:true,recipient:true,subject:true,body:true,approvedAt:true,approvedBy:true,supplier:{select:{id:true,name:true,type:true,status:true,email:true,contacts:{select:{email:true}}}}}});
 if(!entry)return null;
 const latest=await db.hotelInquiry.findFirst({where:{tourId:entry.tourId,supplierId:entry.supplierId,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},select:{id:true},orderBy:[{createdAt:"desc"},{id:"desc"}]});
 const outbox=await db.epochEmailOutbox.findUnique({where:{eventKey:supplierEventKey(id)},select:{id:true,status:true,providerMessageId:true,acceptedAt:true,lastAttemptAt:true,lastError:true}});
 const content=evaluateHotelSendReadiness(entry);
 const review=reviewSupplierSend({inquiryId:id,recipient:entry.recipient,supplierType:String(entry.supplier.type),supplierEmail:entry.supplier.email,contactEmails:entry.supplier.contacts.map(c=>c.email).filter((v):v is string=>!!v),contentReady:content.ready,isNewest:latest?.id===id,outboxExists:!!outbox});
 return {entry,content,review,outbox};
}

export async function GET(_request:Request,{params}:InquiryIdParams){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 const {id}=await params;if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 const record=await getReview(id);if(!record)return reply({error:"Inquiry not found"},404);
 const {entry,content,review,outbox}=record;
 const preview=formatHotelInquiryEmail(entry.subject,entry.body,false);
 return reply({previewHtml:preview.html,previewText:preview.text,inquiryId:id,supplier:{id:entry.supplier.id,name:entry.supplier.name,status:String(entry.supplier.status)},to:entry.recipient,subject:entry.subject,body:entry.body,stay:{destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},approvedAt:entry.approvedAt,contentBlocks:content.blocks,outbox:outbox||null,sendEnabled:SUPPLIER_SEND_ENABLED,...review});
}

/** Prepared Stage 3B implementation; disabled by a constant, not an environment toggle.
 * No server operator can accidentally enable live supplier delivery with an env variable.
 * A separately reviewed change is required to activate this pathway. */
export async function POST(request:Request,{params}:InquiryIdParams){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 if(!SUPPLIER_SEND_ENABLED)return reply({error:"Stage 3B is review-only. Supplier sending remains locked; no outbox record or email created.",sendEnabled:false},423);
 // Defense in depth for the future explicitly enabled version.
 if(process.env.NODE_ENV!=="development"||!isAuthorizedTestDatabase(process.env.DATABASE_URL,process.env.DIRECT_URL))return reply({error:"Not on approved isolated development database; no send attempted."},403);
 if(!process.env.RESEND_API_KEY?.trim())return reply({error:"Email delivery is unavailable; no send attempted."},503);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"Same-origin confirmation required."},403);
 const {id}=await params;if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 let body:unknown;try{body=await request.json()}catch{return reply({error:"Invalid send authorization."},400)}
 const record=await getReview(id);if(!record)return reply({error:"Inquiry not found"},404);
 const {entry,review}=record;
 if(!review.readyForActivation)return reply({error:"Supplier sending is blocked by review checks.",blocks:review.blocks},409);
 if(!validateSupplierSendConfirmation(body,{inquiryId:id,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject}))return reply({error:"Exact supplier, recipient, CC, subject and SEND SUPPLIER confirmation required."},400);
 const key=supplierEventKey(id);
 const formatted=formatHotelInquiryEmail(entry.subject,entry.body,false);
 const snapshot=supplierSendSnapshot({inquiryId:id,supplierId:entry.supplierId,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:formatted.html,text:formatted.text});
 try{
  await db.epochEmailOutbox.create({data:{id:randomUUID(),eventKey:key,recipient:entry.recipient,subject:entry.subject,body:snapshot,targetUrl:`supplier:hotel-inquiry:${id}`,status:"SENDING",attempts:1,lastAttemptAt:new Date(),leaseExpiresAt:new Date(Date.now()+10*60*1000)}});
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_CLAIM_FAILED",e);return reply({error:"Supplier attempt already exists or could not be reserved. Never retry automatically. Check outbox history."},409)}
 // The one-time claim is COMMITTED before contacting the provider. No automatic retry exists.
 let status:"ACCEPTED"|"FAILED"|"UNCERTAIN"="UNCERTAIN";
 let providerMessageId:string|null=null;
 try{
  const result=await sendEmail({to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:formatted.html,text:formatted.text});
  if(result&&"data" in result&&result.data?.id&&!result.error){status="ACCEPTED";providerMessageId=result.data.id;}
  else if(result&&"error" in result&&result.error){status="FAILED";}
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_RESULT_UNCERTAIN",e)}
 try{
  await db.epochEmailOutbox.update({where:{eventKey:key},data:{status,providerMessageId,acceptedAt:status==="ACCEPTED"?new Date():null,lastError:status==="FAILED"?"Provider returned an explicit error":status==="UNCERTAIN"?"Outcome unknown; investigate manually before any new attempt":null,leaseExpiresAt:null,updatedAt:new Date()}});
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_AUDIT_FINALIZATION_FAILED",e);return reply({error:"A supplier send may have occurred, but audit update failed. DO NOT retry; inspect outbox and provider records."},503)}
 return reply({inquiryId:id,to:entry.recipient,cc:SUPPLIER_CC,status,providerMessageId,deliveryConfirmed:false});
}
