import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { evaluateHotelSendReadiness } from "@/lib/epoch-ai/hotelSendReadiness";
import { formatHotelInquiryEmail } from "@/lib/epoch-ai/hotelInquiryEmailFormat";
import { sendEmail } from "@/lib/email/sendEmail";
import { reviewSupplierSend, supplierEventKey, supplierStayEventKey, SUPPLIER_SEND_ENABLED, SUPPLIER_CC, supplierSendSnapshot, supplierMessageFingerprint, validateSupplierSendConfirmation, validateSupplierAuthorizationRehearsal, supplierDeliveryStateWithEvents } from "@/lib/epoch-ai/hotelSupplierSendSafety";
import { isAuthorizedTestDatabase } from "@/lib/epoch-ai/hotelTestEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (obj: Record<string, unknown>, status=200) => NextResponse.json(obj, {status, headers:{"Cache-Control":"no-store"}});

type InquiryIdParams={params:Promise<{id:string}>};
async function getReview(id:string){
 const entry=await db.hotelInquiry.findUnique({where:{id},select:{id:true,tourId:true,supplierId:true,destination:true,checkIn:true,checkOut:true,rooms:true,status:true,recipient:true,subject:true,body:true,approvedAt:true,approvedBy:true,supplier:{select:{id:true,name:true,type:true,status:true,email:true,contacts:{select:{email:true}}}}}});
 if(!entry)return null;
 const latest=await db.hotelInquiry.findFirst({where:{tourId:entry.tourId,supplierId:entry.supplierId,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},select:{id:true},orderBy:[{createdAt:"desc"},{id:"desc"}]});
 // Read all inquiry versions to block historical send attempts as well as new stay-key claims.
 const stayVersions=await db.hotelInquiry.findMany({
   where:{tourId:entry.tourId,supplierId:entry.supplierId,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},
   select:{id:true}
 });
 const stayKey=supplierStayEventKey(entry);
 const priorKeys=stayVersions.map(v=>supplierEventKey(v.id));
 const outbox=await db.epochEmailOutbox.findFirst({
   where:{eventKey:{in:[stayKey,...priorKeys]}},
   select:{id:true,status:true,providerMessageId:true,acceptedAt:true,lastAttemptAt:true,lastError:true}
 });
 const priorStayAttempt=await db.epochEmailOutbox.findFirst({
   where:{eventKey:{in:[stayKey,...stayVersions.filter(v=>v.id!==id).map(v=>supplierEventKey(v.id))]}},
   select:{id:true,status:true,providerMessageId:true,lastAttemptAt:true}
 });
 const deliveryEvents=outbox
  ? await db.epochSupplierDeliveryEvent.findMany({
      where:{outboxId:outbox.id},
      select:{type:true,occurredAt:true},
      orderBy:{occurredAt:"asc"}
    })
  : [];
 // Pending signed events also count if a webhook arrived before the outbox ID was saved.
 const pendingEvents=outbox?.providerMessageId
   ? await db.epochSupplierWebhookInbox.findMany({
       where:{providerMessageId:outbox.providerMessageId},
       select:{type:true,occurredAt:true},
       orderBy:{occurredAt:"asc"}
     }) : [];
const content=evaluateHotelSendReadiness(entry);
 const review=reviewSupplierSend({inquiryId:id,recipient:entry.recipient,supplierType:String(entry.supplier.type),supplierEmail:entry.supplier.email,contactEmails:entry.supplier.contacts.map(c=>c.email).filter((v):v is string=>!!v),contentReady:content.ready,approved:entry.status==="APPROVED"&&!!entry.approvedAt&&!!entry.approvedBy,isNewest:latest?.id===id,outboxExists:!!outbox,priorStayAttemptExists:!!priorStayAttempt});
 return {entry,content,review,outbox,deliveryEvents:[...deliveryEvents,...pendingEvents]};
}

export async function GET(_request:Request,{params}:InquiryIdParams){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 const {id}=await params;if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 const record=await getReview(id);if(!record)return reply({error:"Inquiry not found"},404);
 const {entry,content,review,outbox}=record;
 const preview=formatHotelInquiryEmail(entry.subject,entry.body,false);
 const fingerprint=supplierMessageFingerprint({inquiryId:id,supplierId:entry.supplierId,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:preview.html,text:preview.text});
 return reply({previewHtml:preview.html,previewText:preview.text,fingerprint,inquiryId:id,supplier:{id:entry.supplier.id,name:entry.supplier.name,status:String(entry.supplier.status)},to:entry.recipient,subject:entry.subject,body:entry.body,stay:{destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},approvedAt:entry.approvedAt,contentBlocks:content.blocks,outbox:outbox||null,deliveryTracking:supplierDeliveryStateWithEvents(outbox,record.deliveryEvents),sendEnabled:SUPPLIER_SEND_ENABLED,...review});
}

/** Controlled supplier sending: default-off build approval plus explicit environment
 * activation. The server requires an exact Admin fingerprint for every inquiry. */
export async function POST(request:Request,{params}:InquiryIdParams){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 // No-send rehearsal explicitly isolated from live delivery. No provider, DB writes or outbox claim.
 // The ordinary POST path continues to return HTTP 423 while live sending is hard locked.
 const {id}=await params;
 if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"Same-origin confirmation required"},403);
 let submitted:unknown;
 try{submitted=await request.json()}catch{return reply({error:"Invalid authorization request"},400)}
 if(submitted && typeof submitted==="object" && (submitted as {mode?:unknown}).mode==="VALIDATE_ONLY"){
  const record=await getReview(id);if(!record)return reply({error:"Inquiry not found"},404);
  const {entry,review}=record;
  const rendered=formatHotelInquiryEmail(entry.subject,entry.body,false);
  const fingerprint=supplierMessageFingerprint({inquiryId:id,supplierId:entry.supplierId,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:rendered.html,text:rendered.text});
  if(!validateSupplierAuthorizationRehearsal(submitted,{inquiryId:id,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,fingerprint}))return reply({error:"Preview changed or confirmation invalid. Reload final supplier review; nothing was sent."},409);
  if(!review.readyForActivation)return reply({error:"No-send validation blocked by supplier safety checks",blocks:review.blocks},409);
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return reply({error:"Admin identity unavailable",sent:false},403);
  return reply({status:"VALIDATED_NOT_SENT",inquiryId:id,validatedBy:session.user.id,fingerprint,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,sent:false,outboxCreated:false,sendEnabled:false});
 }
 if(!SUPPLIER_SEND_ENABLED)return reply({error:"Stage 3B is review-only. Supplier sending remains locked; no outbox record or email created.",sendEnabled:false},423);
 // Defense in depth for the future explicitly enabled version.
 if(process.env.NODE_ENV!=="production" &&
    !(process.env.NODE_ENV==="development" && isAuthorizedTestDatabase(process.env.DATABASE_URL,process.env.DIRECT_URL)))
   return reply({error:"Supplier sending is not allowed in this environment."},403);
 if(!process.env.RESEND_API_KEY?.trim())return reply({error:"Email delivery is unavailable; no send attempted."},503);
 const body=submitted;
 const record=await getReview(id);if(!record)return reply({error:"Inquiry not found"},404);
 const {entry,review}=record;
 if(entry.status!=="APPROVED"||!entry.approvedAt)return reply({error:"An approved inquiry is required; nothing sent."},409);
 if(!review.readyForActivation)return reply({error:"Supplier sending is blocked by review checks.",blocks:review.blocks},409);
 const formatted=formatHotelInquiryEmail(entry.subject,entry.body,false);
 const fingerprint=supplierMessageFingerprint({inquiryId:id,supplierId:entry.supplierId,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:formatted.html,text:formatted.text});
 if(!validateSupplierSendConfirmation(body,{inquiryId:id,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,fingerprint}))return reply({error:"Exact fingerprint, supplier, recipient, CC, subject and SEND SUPPLIER confirmation required."},400);
 const session=await getServerSession(authOptions);
 if(!session?.user?.id)return reply({error:"Admin identity unavailable; no sending attempted."},403);
 const actor=session.user.id;
 const key=supplierStayEventKey(entry);
 const snapshot=supplierSendSnapshot({inquiryId:id,supplierId:entry.supplierId,to:entry.recipient,cc:SUPPLIER_CC,subject:entry.subject,html:formatted.html,text:formatted.text,authorizedBy:actor,authorizedAt:new Date().toISOString(),fingerprint});
 try{
  await db.epochEmailOutbox.create({data:{id:randomUUID(),eventKey:key,recipient:entry.recipient,subject:entry.subject,body:snapshot,targetUrl:`supplier:hotel-inquiry:${id}`,status:"SENDING",attempts:1,lastAttemptAt:new Date(),leaseExpiresAt:new Date(Date.now()+10*60*1000)}});
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_CLAIM_FAILED",e);return reply({error:"Supplier attempt already exists or could not be reserved. Never retry automatically. Check outbox history."},409)}
 // The one-time claim is COMMITTED before contacting the provider. No automatic retry exists.
 let status:"ACCEPTED"|"FAILED"|"UNCERTAIN"="UNCERTAIN";
 let providerMessageId:string|null=null;
 try{
  const result=await sendEmail({to:entry.recipient,cc:SUPPLIER_CC,replyTo:"erdal@epochjourneys.com",subject:entry.subject,html:formatted.html,text:formatted.text});
  if(result&&"data" in result&&result.data?.id&&!result.error){status="ACCEPTED";providerMessageId=result.data.id;}
  else if(result&&"error" in result&&result.error){status="FAILED";}
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_RESULT_UNCERTAIN",e)}
 try{
  await db.$transaction(async(tx)=>{
   const updated=await tx.epochEmailOutbox.update({where:{eventKey:key},data:{status,providerMessageId,acceptedAt:status==="ACCEPTED"?new Date():null,lastError:status==="FAILED"?"Provider returned an explicit error":status==="UNCERTAIN"?"Outcome unknown; investigate manually before any new attempt":null,leaseExpiresAt:null,updatedAt:new Date()}});
   if(providerMessageId){
    const pending=await tx.epochSupplierWebhookInbox.findMany({where:{providerMessageId},select:{id:true,type:true,occurredAt:true}});
    if(pending.length){
     await tx.epochSupplierDeliveryEvent.createMany({data:pending.map(p=>({id:p.id,outboxId:updated.id,providerMessageId,type:p.type,occurredAt:p.occurredAt})),skipDuplicates:true});
     await tx.epochSupplierWebhookInbox.deleteMany({where:{id:{in:pending.map(p=>p.id)}}});
    }
   }
  });
 }catch(e){console.error("HOTEL_SUPPLIER_SEND_AUDIT_FINALIZATION_FAILED",e);return reply({error:"A supplier send may have occurred, but audit update failed. DO NOT retry; inspect outbox and provider records."},503)}
 return reply({inquiryId:id,to:entry.recipient,cc:SUPPLIER_CC,status,providerMessageId,deliveryConfirmed:false});
}
