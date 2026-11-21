import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { evaluateHotelSendReadiness } from "@/lib/epoch-ai/hotelSendReadiness";
import { reviewSupplierSend, supplierEventKey, SUPPLIER_SEND_ENABLED } from "@/lib/epoch-ai/hotelSupplierSendSafety";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(obj:Record<string,unknown>,status=200)=>NextResponse.json(obj,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 const {id}=await params;if(!id||id.length>128)return reply({error:"Invalid inquiry ID"},400);
 const entry=await db.hotelInquiry.findUnique({where:{id},select:{id:true,tourId:true,supplierId:true,destination:true,checkIn:true,checkOut:true,rooms:true,status:true,recipient:true,subject:true,body:true,approvedAt:true,approvedBy:true,supplier:{select:{id:true,name:true,type:true,status:true,email:true,contacts:{select:{email:true}}}}}});
 if(!entry)return reply({error:"Inquiry not found"},404);
 const latest=await db.hotelInquiry.findFirst({where:{tourId:entry.tourId,supplierId:entry.supplierId,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},select:{id:true},orderBy:[{createdAt:"desc"},{id:"desc"}]});
 const outbox=await db.epochEmailOutbox.findUnique({where:{eventKey:supplierEventKey(id)},select:{id:true,status:true,providerMessageId:true,acceptedAt:true}});
 const content=evaluateHotelSendReadiness(entry);
 const review=reviewSupplierSend({inquiryId:id,recipient:entry.recipient,supplierType:String(entry.supplier.type),supplierEmail:entry.supplier.email,contactEmails:entry.supplier.contacts.map(c=>c.email).filter((v):v is string=>!!v),contentReady:content.ready,isNewest:latest?.id===id,outboxExists:!!outbox});
 return reply({inquiryId:id,supplier:{id:entry.supplier.id,name:entry.supplier.name,status:String(entry.supplier.status)},to:entry.recipient,subject:entry.subject,stay:{destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},approvedAt:entry.approvedAt,contentBlocks:content.blocks,outbox:outbox||null,sendEnabled:SUPPLIER_SEND_ENABLED,...review});
}
/** A hard stop: no sendEmail import or provider call exists in this route. */
export async function POST(_request:Request){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 return reply({error:"Supplier email sending is LOCKED in Stage 3A. No outbox claim created; no supplier email attempted.",sendEnabled:SUPPLIER_SEND_ENABLED},423);
}
