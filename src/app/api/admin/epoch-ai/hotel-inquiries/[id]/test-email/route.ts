import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { evaluateHotelSendReadiness } from "@/lib/epoch-ai/hotelSendReadiness";
import { HOTEL_TEST_RECIPIENT,HOTEL_TEST_CC,testOutboxSnapshot,isAuthorizedTestDatabase,testEventKey } from "@/lib/epoch-ai/hotelTestEmail";

import { formatHotelInquiryEmail } from "@/lib/epoch-ai/hotelInquiryEmailFormat";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 if(process.env.NODE_ENV!=="development"||!isAuthorizedTestDatabase(process.env.DATABASE_URL,process.env.DIRECT_URL))return reply({error:"Test sending disabled: only the approved isolated development database is allowed."},403);
 if(!process.env.RESEND_API_KEY?.trim())return reply({error:"RESEND_API_KEY is not available in the protected development environment; no email attempted."},503);
 const origin=request.headers.get("origin");
 if(!origin || origin!==new URL(request.url).origin)return reply({error:"Same-origin confirmation required."},403);
 let data:unknown;try{data=await request.json()}catch{return reply({error:"Invalid confirmation"},400)}
 if(!data||typeof data!=="object"||!("confirmation" in data)||(data as {confirmation:unknown}).confirmation!=="SEND TEST")return reply({error:"Explicit SEND TEST confirmation required."},400);
 const {id}=await params;
 if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 const row=await db.hotelInquiry.findUnique({where:{id},select:{id:true,status:true,recipient:true,subject:true,body:true,destination:true,checkIn:true,checkOut:true,rooms:true,approvedAt:true,approvedBy:true}});
 if(!row)return reply({error:"Inquiry not found"},404);
 const readiness=evaluateHotelSendReadiness(row);
 if(!readiness.ready)return reply({error:"Approved inquiry did not pass readiness checks. Prepare a new corrected draft first.",blocks:readiness.blocks},409);
 const key=testEventKey(id);
 const existing=await db.epochEmailOutbox.findUnique({where:{eventKey:key},select:{status:true,providerMessageId:true,acceptedAt:true}});
 if(existing)return reply({error:"A test for this approved inquiry was already attempted. Review its recorded result; never retry automatically.",status:existing.status,providerMessageId:existing.providerMessageId},409);
 const subject=`TEST – ${row.subject}`;
 const formatted=formatHotelInquiryEmail(subject,row.body,true);
 const outboxBody=testOutboxSnapshot({inquiryId:id,to:HOTEL_TEST_RECIPIENT,cc:HOTEL_TEST_CC,subject,html:formatted.html,text:formatted.text});
 try{
  await db.epochEmailOutbox.create({data:{id:randomUUID(),eventKey:key,recipient:HOTEL_TEST_RECIPIENT,subject,body:outboxBody,targetUrl:`test:hotel-inquiry:${id}`,status:"SENDING",attempts:1,lastAttemptAt:new Date(),leaseExpiresAt:new Date(Date.now()+10*60*1000)}});
 }catch(err){console.error("HOTEL_TEST_CLAIM",err);return reply({error:"Test attempt could not be reserved or has already been claimed. No retry; check test history."},409)}
 // A committed one-time claim prevents duplicate sends across clicks and concurrent requests.
 let status:"ACCEPTED"|"FAILED"|"UNCERTAIN"="UNCERTAIN";
 let providerMessageId:string|null=null;
 try{
  const response=await sendEmail({to:HOTEL_TEST_RECIPIENT,cc:HOTEL_TEST_CC,subject,html:formatted.html,text:formatted.text});
  if(response&&"data" in response&&response.data?.id&&!response.error){status="ACCEPTED";providerMessageId=response.data.id;}
  else if(response&&"error" in response&&response.error){status="FAILED";}
 }catch(e){console.error("HOTEL_TEST_DELIVERY_UNCERTAIN",e)}
 try{
  await db.epochEmailOutbox.update({where:{eventKey:key},data:{status,providerMessageId,acceptedAt:status==="ACCEPTED"?new Date():null,lastError:status==="UNCERTAIN"?"Provider result uncertain; do not retry automatically":status==="FAILED"?"Provider rejected test email":null,leaseExpiresAt:null,updatedAt:new Date()}});
 }catch(e){console.error("HOTEL_TEST_AUDIT_UPDATE_FAILED",e);return reply({error:"Test email attempted but delivery audit could not be finalized. Do not retry; inspect the email outbox."},503)}
 return reply({status,providerMessageId,recipient:HOTEL_TEST_RECIPIENT,cc:HOTEL_TEST_CC,supplierSent:false});
}
