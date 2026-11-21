import Link from "next/link";
import { db } from "@/lib/db";

export default async function TourPackagesPage() {
  const tours = await db.tour.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, title: true, category: true, duration: true, isPublished: true, shortDescription: true, mainImageUrl: true } });
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">Epoch Journeys / Products</p><h1 className="mt-2 text-3xl font-bold text-[#001F3F]">Tour Packages</h1><p className="mt-2 text-slate-600">Prepare agent-facing content, review and explicitly publish each journey. Tour operations and quotation data remain separate.</p></div>
    <div className="grid gap-4 md:grid-cols-2">{tours.map(t => <Link key={t.id} href={`/admin/tour-packages/${t.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#8B0000]"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-[#001F3F]">{t.title}</h2><span className={`rounded-full px-2 py-1 text-xs font-semibold ${t.isPublished ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>{t.isPublished ? "Published" : "Draft"}</span></div><p className="mt-2 text-sm text-slate-500">{t.category} · {t.duration} days</p><p className="mt-3 text-sm text-slate-600">{t.shortDescription || "Sales introduction not yet prepared"}</p><p className="mt-4 text-sm font-semibold text-[#8B0000]">Manage package →</p></Link>)}</div>
    {tours.length === 0 && <p>No tours yet. Create a tour first.</p>}
  </main>;
}
