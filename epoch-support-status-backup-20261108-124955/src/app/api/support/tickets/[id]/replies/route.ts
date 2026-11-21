import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { absoluteAdminUrl, createAdminAlert, notifyEmail, supportAdminEmail } from "@/lib/support/notifications";

type Ctx={params:Promise<{id:string}>};
type Reply={id:string;authorRole:string;authorId:string;message:string;createdAt:Date;emailDelivered:boolean};
async function authorize(id:string){
  const session=await getServerSession(authOptions);
  if(!session?.user?.id || !["ADMIN","AGENT"].includes(session.user.role||"")) return null;
  const ticket=await db.supportMessage.findUnique({where:{id},select:{id:true,userId:true,subject:true,status:true}});
  if(!ticket || (session.user.role==="AGENT" && ticket.userId!==session.user.id))return null;
  return {session,ticket};
}
export async function GET(_request:Request,{params}:Ctx){
  const {id}=await params;
  const authorized=await authorize(id);if(!authorized)return NextResponse.json({error:"Not found"},{status:404});
  try {
    const replies=await db.$queryRaw<Reply[]>`SELECT "id","authorRole","authorId","message","createdAt","emailDelivered" FROM "EpochSupportReply" WHERE "ticketId"=${id} ORDER BY "createdAt" ASC LIMIT 200`;
    return NextResponse.json({replies},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.error("Support replies error",e);return NextResponse.json({error:"Support database migration is required"},{status:503});}
}
export async function POST(request:Request,{params}:Ctx){
  const {id}=await params;
  const authorized=await authorize(id);if(!authorized)return NextResponse.json({error:"Not found"},{status:404});
  const origin=request.headers.get("origin");
  if(origin){try{if(new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Invalid origin"},{status:403});}catch{return NextResponse.json({error:"Invalid origin"},{status:403});}}
  const {session,ticket}=authorized;
  const limit=checkRateLimit(`support-reply:${session.user.id}`,20,60*60*1000);
  if(!limit.allowed)return NextResponse.json({error:"Too many replies. Try again later."},{status:429});
  const payload=await request.json().catch(()=>null);
  const message=typeof payload?.message==="string"?payload.message.trim():"";
  if(!message || message.length>8000)return NextResponse.json({error:"Message must be between 1 and 8000 characters"},{status:400});
  const isAdmin=session.user.role==="ADMIN";
  const replyId=randomUUID();
  try{
    await db.$executeRaw`INSERT INTO "EpochSupportReply" ("id","ticketId","authorRole","authorId","message","createdAt","emailDelivered") VALUES (${replyId},${id},${isAdmin?"ADMIN":"AGENT"},${session.user.id},${message},NOW(),FALSE)`;
    if(ticket.status==="RESOLVED")await db.supportMessage.update({where:{id},data:{status:"IN_PROGRESS"}});
  }catch(e){console.error("Reply could not be stored",e);return NextResponse.json({error:"Reply could not be saved; check database migration"},{status:503});}
  const recipient=isAdmin?await db.user.findUnique({where:{id:ticket.userId},select:{email:true}}):null;
  const to=isAdmin?(recipient?.email||""):supportAdminEmail();
  const link=absoluteAdminUrl(isAdmin?`/b2b/support`:`/admin/support/${id}`);
  const eventTitle=isAdmin?"Epoch Journeys Support: Admin reply":"Epoch Journeys Support: Agent replied";
  if(!isAdmin)await createAdminAlert(`support-reply:${replyId}`,eventTitle,`Agent replied to ${ticket.subject}`,`/admin/support/${id}`);
  const delivered=!!to && !!link && await notifyEmail(to,`${eventTitle} - ${ticket.subject}`,message,link);
  if(delivered){try{await db.$executeRaw`UPDATE "EpochSupportReply" SET "emailDelivered"=TRUE WHERE "id"=${replyId}`}catch(e){console.error("Could not update email delivery",e);}}
  // Admin receives a copy of all outgoing agent replies, without duplicating the agent's delivery.
  if(isAdmin){
    await createAdminAlert(`support-admin-reply:${replyId}`,"Admin support reply recorded",`Reply sent to agency for ${ticket.subject}`,`/admin/support/${id}`);
    const adminLink=absoluteAdminUrl(`/admin/support/${id}`);
    if(adminLink)await notifyEmail(supportAdminEmail(),`Admin support reply recorded - ${ticket.subject}`,message,adminLink);
  }
  return NextResponse.json({success:true,saved:true,emailDelivered:delivered,replyId},{status:201});
}
