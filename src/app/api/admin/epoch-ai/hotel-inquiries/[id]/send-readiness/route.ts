import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";
import { evaluateHotelSendReadiness } from "@/lib/epoch-ai/hotelSendReadiness";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);
 if(!session?.user||session.user.role!==Role.ADMIN)return NextResponse.json({error:"Admin required"},{status:403});
 const {id}=await params;
 if(!id||id.length>128)return NextResponse.json({error:"Invalid inquiry id"},{status:400});
 const row=await db.hotelInquiry.findUnique({where:{id},select:{id:true,status:true,recipient:true,subject:true,body:true,destination:true,checkIn:true,checkOut:true,rooms:true,approvedAt:true,approvedBy:true}});
 if(!row)return NextResponse.json({error:"Inquiry not found"},{status:404});
 const result=evaluateHotelSendReadiness(row);
 return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
