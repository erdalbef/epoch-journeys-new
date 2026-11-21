import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierType } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";
import { validateHotelInquiry } from "@/lib/epoch-ai/hotelInquiryHistory";
import { reviewHotelInquiryContent } from "@/lib/epoch-ai/hotelInquiryApprovalGate";

async function isAdmin(){const s=await getServerSession(authOptions);return s?.user?.role===Role.ADMIN?s:null;}
export async function GET(req:Request){
 const session=await isAdmin(); if(!session)return NextResponse.json({error:"Admin required"},{status:403});
 const tourId=new URL(req.url).searchParams.get("tourId");
 if(!tourId||tourId.length>128)return NextResponse.json({error:"Tour required"},{status:400});
 const entries=await db.hotelInquiry.findMany({where:{tourId},select:{id:true,supplierId:true,recipient:true,subject:true,body:true,destination:true,checkIn:true,checkOut:true,rooms:true,status:true,createdAt:true,approvedAt:true,supplier:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100});
 return NextResponse.json({entries});
}
export async function POST(req:Request){
 const session=await isAdmin(); if(!session)return NextResponse.json({error:"Admin required"},{status:403});
 try{
  const input=validateHotelInquiry(await req.json());
  const review = reviewHotelInquiryContent({
   recipient:input.recipient,subject:input.subject,body:input.body,destination:input.stay.city,
   checkIn:input.stay.checkIn,checkOut:input.stay.checkOut,rooms:input.stay.rooms
  });
  if(!review.valid)return NextResponse.json({error:"Draft content is not ready; correct these issues before saving.",blocks:review.blocks},{status:400});
  const [tour,supplier]=await Promise.all([db.tour.findUnique({where:{id:input.tourId},select:{id:true}}),db.supplier.findUnique({where:{id:input.supplierId},select:{id:true,type:true,city:true}})]);
  if(!tour||!supplier||supplier.type!==SupplierType.HOTEL)return NextResponse.json({error:"Tour or CRM hotel not found"},{status:400});
  const saved=await db.hotelInquiry.create({data:{tourId:tour.id,supplierId:supplier.id,destination:input.stay.city,checkIn:input.stay.checkIn,checkOut:input.stay.checkOut,rooms:input.stay.rooms,recipient:input.recipient,subject:input.subject,body:input.body,status:"DRAFT",createdBy:session.user.email||session.user.id||"admin"},select:{id:true,status:true}});
  return NextResponse.json({saved},{status:201});
 }catch(err){if(err instanceof Error&&/required|Invalid|Valid|match/i.test(err.message))return NextResponse.json({error:err.message},{status:400});console.error("HOTEL_INQUIRY_CREATE",err);return NextResponse.json({error:"Could not save inquiry draft"},{status:500});}
}
