import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { db } from "@/lib/db";
type Alert={id:string;title:string;description:string;href:string;createdAt:Date;readAt:Date|null};
export async function GET(){const denied=await requireAdminApiAccess();if(denied)return denied;try{
 const [alerts,total]=await Promise.all([db.$queryRaw<Alert[]>`SELECT "id","title","description","href","createdAt","readAt" FROM "EpochAdminAlert" ORDER BY "createdAt" DESC LIMIT 100`,db.$queryRaw<{count:bigint}[]>`SELECT COUNT(*)::bigint AS count FROM "EpochAdminAlert" WHERE "readAt" IS NULL`]);
 return NextResponse.json({alerts,unread:Number(total[0]?.count||0)},{headers:{"Cache-Control":"no-store"}});
}catch(e){console.error(e);return NextResponse.json({error:"Notifications database migration required"},{status:503});}}
export async function PATCH(request:Request){const denied=await requireAdminApiAccess();if(denied)return denied;const origin=request.headers.get("origin");if(origin){try{if(new URL(origin).host!==request.headers.get("host"))return NextResponse.json({error:"Invalid origin"},{status:403});}catch{return NextResponse.json({error:"Invalid origin"},{status:403});}}const input=await request.json().catch(()=>null);if(typeof input?.id!=="string"||input.id.length>100)return NextResponse.json({error:"Invalid notification"},{status:400});await db.$executeRaw`UPDATE "EpochAdminAlert" SET "readAt"=NOW() WHERE "id"=${input.id}`;return NextResponse.json({success:true});}
