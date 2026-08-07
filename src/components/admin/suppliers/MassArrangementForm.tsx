"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export default function MassArrangementForm({
  suppliers,
  tours,
  bookings,
  initialSupplierId,
}: {
  suppliers: Option[];
  tours: Option[];
  bookings: Option[];
  initialSupplierId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    supplierId: initialSupplierId || "",
    tourId: "",
    bookingId: "",
    churchName: "",
    shrineName: "",
    country: "",
    city: "",
    address: "",
    massDate: "",
    massTime: "",
    language: "English",
    celebrantName: "",
    sacristyContactName: "",
    sacristyContactEmail: "",
    sacristyContactPhone: "",
    groupSize: "",
    status: "REQUESTED",
    confirmationReference: "",
    donationAmount: "",
    currency: "EUR",
    paymentStatus: "NOT_REQUIRED",
    busAccessNotes: "",
    accessibilityNotes: "",
    liturgicalNotes: "",
    vestmentNotes: "",
    specialRequirements: "",
    internalNotes: "",
  });

  const input = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#001F3F]/40";
  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/mass-arrangements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, groupSize: form.groupSize ? Number(form.groupSize) : null, donationAmount: form.donationAmount ? Number(form.donationAmount) : null }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not create Mass arrangement.");
      router.push("/admin/mass-arrangements"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create Mass arrangement."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-6">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Church & Mass details</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium">Church / shrine supplier<select className={input} value={form.supplierId} onChange={(e)=>update("supplierId",e.target.value)}><option value="">Not linked</option>{suppliers.map((x)=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="text-sm font-medium xl:col-span-2">Church name *<input required className={input} value={form.churchName} onChange={(e)=>update("churchName",e.target.value)}/></label>
        <label className="text-sm font-medium">Shrine / chapel<input className={input} value={form.shrineName} onChange={(e)=>update("shrineName",e.target.value)}/></label>
        <label className="text-sm font-medium">Country<input className={input} value={form.country} onChange={(e)=>update("country",e.target.value)}/></label>
        <label className="text-sm font-medium">City<input className={input} value={form.city} onChange={(e)=>update("city",e.target.value)}/></label>
        <label className="text-sm font-medium md:col-span-2">Address<input className={input} value={form.address} onChange={(e)=>update("address",e.target.value)}/></label>
        <label className="text-sm font-medium">Mass date<input type="date" className={input} value={form.massDate} onChange={(e)=>update("massDate",e.target.value)}/></label>
        <label className="text-sm font-medium">Mass time<input type="time" className={input} value={form.massTime} onChange={(e)=>update("massTime",e.target.value)}/></label>
        <label className="text-sm font-medium">Language<input className={input} value={form.language} onChange={(e)=>update("language",e.target.value)}/></label>
        <label className="text-sm font-medium">Celebrant<input className={input} value={form.celebrantName} onChange={(e)=>update("celebrantName",e.target.value)}/></label>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Operational linkage & confirmation</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium">Tour<select className={input} value={form.tourId} onChange={(e)=>update("tourId",e.target.value)}><option value="">Not linked</option>{tours.map((x)=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="text-sm font-medium">Booking<select className={input} value={form.bookingId} onChange={(e)=>update("bookingId",e.target.value)}><option value="">Not linked</option>{bookings.map((x)=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label className="text-sm font-medium">Group size<input type="number" className={input} value={form.groupSize} onChange={(e)=>update("groupSize",e.target.value)}/></label>
        <label className="text-sm font-medium">Status<select className={input} value={form.status} onChange={(e)=>update("status",e.target.value)}>{["REQUESTED","PENDING","CONFIRMED","DECLINED","CANCELLED"].map((x)=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-medium">Confirmation reference<input className={input} value={form.confirmationReference} onChange={(e)=>update("confirmationReference",e.target.value)}/></label>
        <label className="text-sm font-medium">Donation / fee<input type="number" step="0.01" className={input} value={form.donationAmount} onChange={(e)=>update("donationAmount",e.target.value)}/></label>
        <label className="text-sm font-medium">Currency<input className={input} value={form.currency} onChange={(e)=>update("currency",e.target.value.toUpperCase())}/></label>
        <label className="text-sm font-medium">Payment status<select className={input} value={form.paymentStatus} onChange={(e)=>update("paymentStatus",e.target.value)}>{["NOT_REQUIRED","PENDING","PAID"].map((x)=><option key={x}>{x}</option>)}</select></label>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Sacristy contact & pilgrimage notes</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium">Contact name<input className={input} value={form.sacristyContactName} onChange={(e)=>update("sacristyContactName",e.target.value)}/></label>
        <label className="text-sm font-medium">Contact email<input className={input} value={form.sacristyContactEmail} onChange={(e)=>update("sacristyContactEmail",e.target.value)}/></label>
        <label className="text-sm font-medium">Contact phone<input className={input} value={form.sacristyContactPhone} onChange={(e)=>update("sacristyContactPhone",e.target.value)}/></label>
        {[
          ["busAccessNotes","Bus access / parking"],
          ["accessibilityNotes","Accessibility"],
          ["liturgicalNotes","Liturgical notes"],
          ["vestmentNotes","Vestments"],
          ["specialRequirements","Special requirements"],
          ["internalNotes","Internal notes"],
        ].map(([key,label])=><label key={key} className="text-sm font-medium">{label}<textarea className={`${input} min-h-24`} value={form[key as keyof typeof form]} onChange={(e)=>update(key as keyof typeof form,e.target.value)}/></label>)}
      </div>
    </section>

    <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Create Mass Arrangement"}</button></div>
  </form>;
}
