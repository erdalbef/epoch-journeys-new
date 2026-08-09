"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BookingOption = {
  id: string;
  bookingReference: string;
  groupName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  agencyNameSnapshot: string | null;
  currency: string;
  netAmount: number;
  amountPaid: number;
  tourTitleSnapshot: string;
  departureDateSnapshot: string;
};

type Line = { description: string; quantity: number; unitPrice: number; taxRate: number };

export default function SalesDocumentForm({ bookings }: { bookings: BookingOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("PROFORMA");
  const [bookingId, setBookingId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [serviceDescriptionEn, setServiceDescriptionEn] = useState("Pilgrimage land arrangements including accommodation, transportation, licensed guides, entrance fees and operational services.");
  const [serviceDescriptionBg, setServiceDescriptionBg] = useState("Поклонническа програма, включваща хотелско настаняване, транспорт, лицензиран екскурзовод, входни такси и организационно обслужване.");
  const [vatEn, setVatEn] = useState("VAT not charged according to Article 21 of the Bulgarian VAT Act (Reverse Charge).");
  const [vatBg, setVatBg] = useState("Основание за неначисляване на ДДС: чл.21 от Закона за ДДС – Обратно начисляване.");
  const [paymentEn, setPaymentEn] = useState("Please include the document number and booking reference in the bank transfer.");
  const [paymentBg, setPaymentBg] = useState("Моля посочете номера на документа и референтния номер на резервацията при банковия превод.");
  const [lines, setLines] = useState<Line[]>([{ description: "Land arrangements", quantity: 1, unitPrice: 0, taxRate: 0 }]);

  const selected = useMemo(() => bookings.find((b) => b.id === bookingId), [bookings, bookingId]);
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 + l.taxRate / 100), 0);

  function selectBooking(id: string) {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setRecipientName(b.customerName || b.agencyNameSnapshot || "");
    setRecipientCompany(b.agencyNameSnapshot || "");
    setRecipientEmail(b.customerEmail || "");
    setLines([{ description: `${b.tourTitleSnapshot} - Land Arrangements`, quantity: 1, unitPrice: Math.max(0, b.netAmount - b.amountPaid), taxRate: 0 }]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      type, bookingId: bookingId || null,
      recipientName, recipientCompany: recipientCompany || null, recipientEmail: recipientEmail || null,
      recipientAddress: form.get("recipientAddress") || null,
      recipientCity: form.get("recipientCity") || null,
      recipientPostalCode: form.get("recipientPostalCode") || null,
      recipientCountry: form.get("recipientCountry") || null,
      recipientTaxNumber: form.get("recipientTaxNumber") || null,
      recipientVatNumber: form.get("recipientVatNumber") || null,
      dueDate: form.get("dueDate") || null,
      serviceDescriptionEn, serviceDescriptionBg, vatEn, vatBg, paymentEn, paymentBg,
      notes: form.get("notes") || null,
      items: lines,
    };
    const response = await fetch("/api/admin/finance/sales-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) { setError(data?.error || "Could not create sales document."); return; }
    router.push(`/admin/finance/sales-documents/${data.id}`); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-6">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#001F3F]">Document & Booking</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Document Type<select className={inputClass} value={type} onChange={(e)=>setType(e.target.value)}><option value="PROFORMA">Proforma Invoice</option><option value="INVOICE">Invoice</option><option value="CREDIT_NOTE">Credit Note</option></select></label>
        <label className={labelClass}>Booking<select className={inputClass} value={bookingId} onChange={(e)=>selectBooking(e.target.value)}><option value="">No booking / manual document</option>{bookings.map((b)=><option key={b.id} value={b.id}>{b.bookingReference} — {b.groupName || b.tourTitleSnapshot}</option>)}</select></label>
        <label className={labelClass}>Due Date<input name="dueDate" type="date" className={inputClass}/></label>
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected ? `${selected.currency} booking balance: ${(selected.netAmount-selected.amountPaid).toFixed(2)}` : "Select a booking to prefill recipient and amount."}</div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#001F3F]">Bill To / Получател</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className={labelClass}>Recipient Name *<input className={inputClass} value={recipientName} onChange={(e)=>setRecipientName(e.target.value)} required/></label>
      <label className={labelClass}>Company<input className={inputClass} value={recipientCompany} onChange={(e)=>setRecipientCompany(e.target.value)}/></label>
      <label className={labelClass}>Email<input type="email" className={inputClass} value={recipientEmail} onChange={(e)=>setRecipientEmail(e.target.value)}/></label>
      <label className={labelClass}>Address<input name="recipientAddress" className={inputClass}/></label>
      <label className={labelClass}>City<input name="recipientCity" className={inputClass}/></label>
      <label className={labelClass}>Postal Code<input name="recipientPostalCode" className={inputClass}/></label>
      <label className={labelClass}>Country<input name="recipientCountry" className={inputClass}/></label>
      <label className={labelClass}>Tax ID<input name="recipientTaxNumber" className={inputClass}/></label>
      <label className={labelClass}>VAT Number<input name="recipientVatNumber" className={inputClass}/></label>
    </div></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#001F3F]">Line Items</h2><button type="button" className={secondaryButton} onClick={()=>setLines([...lines,{description:"",quantity:1,unitPrice:0,taxRate:0}])}>+ Add Item</button></div>
      <div className="mt-4 space-y-3">{lines.map((line,i)=><div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[1fr_110px_150px_110px_90px]">
        <input className={inputClass} placeholder="Description" value={line.description} onChange={(e)=>updateLine(i,{description:e.target.value})} required/>
        <input className={inputClass} type="number" min="0" step="0.01" value={line.quantity} onChange={(e)=>updateLine(i,{quantity:Number(e.target.value)})}/>
        <input className={inputClass} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e)=>updateLine(i,{unitPrice:Number(e.target.value)})}/>
        <input className={inputClass} type="number" min="0" step="0.01" value={line.taxRate} onChange={(e)=>updateLine(i,{taxRate:Number(e.target.value)})}/>
        <button type="button" className="text-sm font-semibold text-red-700" onClick={()=>setLines(lines.filter((_,x)=>x!==i))}>Remove</button>
      </div>)}</div><div className="mt-4 text-right text-lg font-bold text-[#001F3F]">Draft Total: {selected?.currency || "EUR"} {total.toFixed(2)}</div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#001F3F]">Bilingual Invoice Text</h2><p className="mt-1 text-sm text-slate-500">These fields remain easy to rewrite before the document is issued.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">
      <TextArea label="Service Description — English" value={serviceDescriptionEn} setValue={setServiceDescriptionEn}/><TextArea label="Описание на услугата — Български" value={serviceDescriptionBg} setValue={setServiceDescriptionBg}/>
      <TextArea label="VAT Note — English" value={vatEn} setValue={setVatEn}/><TextArea label="ДДС — Български" value={vatBg} setValue={setVatBg}/>
      <TextArea label="Payment Reference — English" value={paymentEn} setValue={setPaymentEn}/><TextArea label="Основание за плащане — Български" value={paymentBg} setValue={setPaymentBg}/>
      <label className={`${labelClass} lg:col-span-2`}>Additional Notes<textarea name="notes" className={`${inputClass} min-h-24 py-3`}/></label>
    </div></section>
    <div className="flex justify-end"><button disabled={busy || lines.length===0} className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save Draft"}</button></div>
  </form>;
}
function TextArea({label,value,setValue}:{label:string;value:string;setValue:(v:string)=>void}) { return <label className={labelClass}>{label}<textarea className={`${inputClass} min-h-28 py-3`} value={value} onChange={(e)=>setValue(e.target.value)}/></label>; }
const labelClass="text-sm font-semibold text-slate-700";
const inputClass="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
const secondaryButton="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]";
