import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id:string }> };
export async function PATCH(request:Request,context:Context){
  const denied=await requireAdminApiAccess();if(denied)return denied;
  const origin=request.headers.get("origin");
  if(origin){try{if(new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Invalid origin"},{status:403});}catch{return NextResponse.json({error:"Invalid origin"},{status:403});}}
  const {id}=await context.params;
  const data=await request.json().catch(()=>null);
  if(!data || !["OPEN","IN_PROGRESS","RESOLVED"].includes(data.status))return NextResponse.json({error:"Invalid status"},{status:400});
  const existing=await db.supportMessage.findUnique({where:{id},select:{id:true}});
  if(!existing)return NextResponse.json({error:"Not found"},{status:404});
  await db.supportMessage.update({where:{id},data:{status:data.status}});
  return NextResponse.json({success:true});
}
