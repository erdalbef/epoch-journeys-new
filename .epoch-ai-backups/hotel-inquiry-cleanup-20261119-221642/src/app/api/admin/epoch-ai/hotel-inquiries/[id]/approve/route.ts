import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session?.user||session.user.role!==Role.ADMIN)return NextResponse.json({error:"Admin required"},{status:403});
 const {id}=await params;
 // Atomic DRAFT -> APPROVED. Approved content cannot be edited in this pilot. No sending.
 const changed=await db.hotelInquiry.updateMany({where:{id,status:"DRAFT"},data:{status:"APPROVED",approvedAt:new Date(),approvedBy:session.user.email||session.user.id||"admin"}});
 if(changed.count!==1)return NextResponse.json({error:"Draft not found or already approved"},{status:409});
 return NextResponse.json({ok:true,status:"APPROVED",sent:false});
}
