import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import HotelProcurementPilot from "@/components/admin/epoch-ai/HotelProcurementPilot";
export default async function TourHotelProcurementPage({params}:{params:Promise<{id:string}>}) {
 const session=await getServerSession(authOptions);
 if (!session?.user || session.user.role!==Role.ADMIN) redirect("/login");
 const {id}=await params;
 const tour=await db.tour.findUnique({where:{id},select:{id:true,title:true,destinations:true}});
 if (!tour) notFound();
 const hotels=await db.supplier.findMany({where:{type:"HOTEL",status:"ACTIVE"},select:{id:true,name:true,city:true,country:true,email:true,preferred:true,contacts:{select:{email:true,isPrimary:true},orderBy:{isPrimary:"desc"}}},orderBy:[{preferred:"desc"},{name:"asc"}],take:500});
 return <main className="mx-auto max-w-7xl space-y-5 p-6"><Link className="text-sm font-medium text-blue-800 underline" href={`/admin/tours/${tour.id}`}>Back to tour</Link><div><p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Epoch AI · Supplier Procurement</p><h1 className="mt-2 text-3xl font-bold text-[#001F3F]">Hotel inquiry preparation</h1><p className="mt-2 text-sm text-slate-600">{tour.title} · Match existing suppliers and prepare the approved master inquiry, without sending it.</p></div><HotelProcurementPilot tourTitle={tour.title} destinations={tour.destinations} hotels={hotels}/></main>;
}
