import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import SalesDocumentForm from "../SalesDocumentForm";

export default async function CreateSalesDocumentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) redirect("/admin-login");
  const bookings = await db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 250, select: { id:true, bookingReference:true, groupName:true, customerName:true, customerEmail:true, agencyNameSnapshot:true, currency:true, netAmount:true, amountPaid:true, tourTitleSnapshot:true, departureDateSnapshot:true } });
  const options = bookings.map((b)=>({...b, departureDateSnapshot:b.departureDateSnapshot.toISOString()}));
  return <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">Finance</p><h1 className="mt-1 text-3xl font-bold text-[#001F3F]">Create Sales Document</h1><p className="mt-2 text-sm text-slate-500">Create a draft Proforma, Invoice or Credit Note. Permanent numbering is assigned only when issued.</p></div><Link href="/admin/finance/sales-documents" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Back</Link></div><SalesDocumentForm bookings={options}/></div>;
}
