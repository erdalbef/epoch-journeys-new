import Link from "next/link";
import { Church, Plus } from "lucide-react";
import { db } from "@/lib/db";

function date(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "Date pending";
}

export default async function MassArrangementsPage() {
  const arrangements = await db.massArrangement.findMany({
    orderBy: [{ massDate: "asc" }, { createdAt: "desc" }],
    include: {
      supplier: { select: { id: true, name: true } },
      tour: { select: { id: true, title: true } },
      booking: { select: { id: true, bookingReference: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">Pilgrimage operations</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Mass Arrangements</h1>
          <p className="mt-2 text-sm text-slate-500">Track requested and confirmed Masses, sacristy contacts, celebrants, donations and access notes.</p>
        </div>
        <Link href="/admin/mass-arrangements/new" className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4"/> New Arrangement
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {arrangements.map((item) => (
            <div key={item.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_.8fr_.7fr_auto] lg:items-center">
              <div className="flex gap-3">
                <span className="rounded-xl bg-slate-100 p-2 text-[#001F3F]"><Church className="h-5 w-5"/></span>
                <div>
                  <p className="font-semibold text-slate-900">{item.churchName}</p>
                  <p className="text-sm text-slate-500">{[item.city, item.country].filter(Boolean).join(", ") || item.supplier?.name || "Location pending"}</p>
                </div>
              </div>
              <div><p className="font-medium text-slate-800">{date(item.massDate)}{item.massTime ? ` · ${item.massTime}` : ""}</p><p className="text-xs text-slate-500">{item.language || "Language pending"}</p></div>
              <div><p className="text-sm text-slate-700">{item.tour?.title || item.booking?.bookingReference || "Not yet linked"}</p><p className="text-xs text-slate-500">{item.celebrantName || "Celebrant pending"}</p></div>
              <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
            </div>
          ))}
          {arrangements.length === 0 && <div className="px-5 py-16 text-center text-sm text-slate-500">No Mass arrangements have been created yet.</div>}
        </div>
      </div>
    </div>
  );
}
