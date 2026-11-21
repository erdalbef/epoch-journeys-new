import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import HotelInquiryHistoryPanel from "@/components/admin/epoch-ai/HotelInquiryHistoryPanel";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const session = await getServerSession(authOptions);
 if (!session?.user?.id || session.user.role !== Role.ADMIN) {
   redirect("/login");
 }

 const currentUser = await db.user.findUnique({
   where: { id: session.user.id },
   select: { role: true, status: true }
 });

 if (currentUser?.role !== Role.ADMIN || currentUser.status !== "ACTIVE") {
   redirect("/login");
 }
 const {id}=await params;const tour=await db.tour.findUnique({where:{id},select:{id:true,title:true}});
 if(!tour)notFound();
 const hotels=await db.supplier.findMany({where:{type:"HOTEL"},select:{id:true,name:true,city:true,email:true,contacts:{select:{email:true,isPrimary:true}}},orderBy:{name:"asc"},take:500});
 return <main className="mx-auto max-w-5xl space-y-5 p-6"><Link className="text-blue-700 underline" href={`/admin/tours/${tour.id}/hotel-procurement`}>Back to Hotel Procurement</Link><h1 className="text-2xl font-bold text-[#001F3F]">Hotel Inquiry History — {tour.title}</h1><p className="text-sm text-amber-800">Development pilot: save and approve inquiry snapshots. Email delivery is disabled. Do not approve a message until the official email signature and recipient have been checked.</p><HotelInquiryHistoryPanel tourId={tour.id} hotels={hotels}/></main>;
}
