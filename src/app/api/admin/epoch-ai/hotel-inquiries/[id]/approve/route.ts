import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";
import { reviewHotelInquiryContent } from "@/lib/epoch-ai/hotelInquiryApprovalGate";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getServerSession(authOptions);if(!session?.user||session.user.role!==Role.ADMIN)return NextResponse.json({error:"Admin required"},{status:403});
 const {id}=await params;
 const entry=await db.hotelInquiry.findUnique({where:{id},select:{id:true,tourId:true,supplierId:true,destination:true,checkIn:true,checkOut:true,rooms:true,recipient:true,subject:true,body:true,status:true,createdAt:true}});
 if(!entry||entry.status!=="DRAFT")return NextResponse.json({error:"Draft not found or already approved"},{status:409});
 const newest=await db.hotelInquiry.findFirst({
  where:{tourId:entry.tourId,supplierId:entry.supplierId,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms},
  select:{id:true},orderBy:[{createdAt:"desc"},{id:"desc"}]
 });
 if(newest?.id!==id)return NextResponse.json({error:"This draft has been superseded by a newer inquiry for the same stay. Open the latest inquiry; older records remain in Full History."},{status:409});
 const review=reviewHotelInquiryContent({recipient:entry.recipient,subject:entry.subject,body:entry.body,destination:entry.destination,checkIn:entry.checkIn,checkOut:entry.checkOut,rooms:entry.rooms});
 if(!review.valid)return NextResponse.json({error:"Cannot approve an inquiry with invalid saved content.",blocks:review.blocks},{status:400});
 // Reconfirm status in the atomic update. No sending, no existing records deleted.
 const changed=await db.hotelInquiry.updateMany({where:{id,status:"DRAFT"},data:{status:"APPROVED",approvedAt:new Date(),approvedBy:session.user.email||session.user.id||"admin"}});
 if(changed.count!==1)return NextResponse.json({error:"Draft already approved or changed"},{status:409});
 return NextResponse.json({ok:true,status:"APPROVED",sent:false});
}
