"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { balkanStays, contactEmail, inquiry, matchingHotels, nights, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";

export default function HotelProcurementPilot({tourTitle,destinations,hotels}:{tourTitle:string;destinations:string[];hotels:HotelContact[]}) {
  const isBalkan=/balkan|mother teresa/i.test(tourTitle);
  const [stays,setStays]=useState<Stay[]>(()=>isBalkan?balkanStays.map(s=>({...s})):destinations.slice(0,20).map(city=>({city,checkIn:"",checkOut:"",rooms:20,massRoom:false})));
  const [active,setActive]=useState(0);
  const [supplierId,setSupplierId]=useState<Record<number,string>>({});
  const [copyStatus,setCopyStatus]=useState("");
  const stay=stays[active];
  const matches=useMemo(()=>stay?matchingHotels(stay.city,hotels):[],[stay,hotels]);
  const chosen=hotels.find(h=>h.id===supplierId[active]);
  const draft=stay?inquiry(stay,chosen?.name||""):null;
  function update<K extends keyof Stay>(field:K,value:Stay[K]) {setStays(current=>current.map((s,i)=>i===active?{...s,[field]:value}:s));setCopyStatus("")}
  async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setCopyStatus(label+" copied. Review and add approved email signature before sending.")}catch{setCopyStatus("Clipboard unavailable; select and copy the draft manually.")}}
  return <div className="space-y-5">
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Preparation only.</strong> This page does not send email, save contacts, book hotels or change supplier rates. {isBalkan?"The seven Balkan stays below are editable reference dates, not confirmed hotel bookings.":"Add and verify the hotel dates before preparing inquiries."} Include the official Epoch Journeys signature in any approved message.</div>
    <div className="flex flex-wrap gap-2">{stays.map((s,i)=><button key={i} type="button" onClick={()=>{setActive(i);setCopyStatus("")}} className={`rounded-lg px-3 py-2 text-sm font-medium ${active===i?"bg-[#001F3F] text-white":"border border-slate-200 bg-white text-slate-700"}`}>{s.city||`Stay ${i+1}`}</button>)}</div>
    {stay?<div className="grid gap-6 lg:grid-cols-2"><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-[#001F3F]">Stay details — review before use</h2>
      <label className="block text-sm font-medium">Destination<input className="mt-1 w-full rounded-lg border p-2" value={stay.city} onChange={e=>update("city",e.target.value)}/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Check-in<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkIn} onChange={e=>update("checkIn",e.target.value)}/></label><label className="text-sm font-medium">Check-out<input className="mt-1 w-full rounded-lg border p-2" type="date" value={stay.checkOut} onChange={e=>update("checkOut",e.target.value)}/></label></div>
      <p className="text-sm text-slate-600">Calculated nights: {nights(stay)||"Review dates"}</p>
      <label className="block text-sm font-medium">Number of rooms<input type="number" min={1} max={250} className="mt-1 w-full rounded-lg border p-2" value={stay.rooms} onChange={e=>update("rooms",Number(e.target.value))}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stay.massRoom} onChange={e=>update("massRoom",e.target.checked)}/> Ask about private Mass meeting room (only where needed)</label>
      <h3 className="font-bold text-[#001F3F]">Existing Supplier CRM matches</h3>
      <select className="w-full rounded-lg border p-2 text-sm" value={supplierId[active]||""} onChange={e=>{setSupplierId(p=>({...p,[active]:e.target.value}));setCopyStatus("")}}><option value="">Choose supplier — optional</option>{matches.map(h=><option key={h.id} value={h.id}>{h.name}{h.preferred?" (preferred)":""} — {h.city}</option>)}</select>
      {chosen?<p className="text-sm">Recipient: <strong>{contactEmail(chosen)||"No email in CRM — verify contact"}</strong> · <Link className="text-blue-700 underline" href={`/admin/suppliers/${chosen.id}`}>Open supplier CRM</Link></p>:<p className="text-sm text-slate-500">{matches.length?`${matches.length} hotel match(es) found. Select one above.`:"No hotel matches for this city. Review Supplier CRM; no new record will be created."}</p>}
      <Link href="/admin/suppliers?type=HOTEL" className="inline-block text-sm font-semibold text-blue-700 underline">Find hotels in existing Supplier CRM</Link>
    </div><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-[#001F3F]">Approved hotel inquiry — draft only</h2>
      {draft?.errors.length?<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{draft.errors.join("; ")}</div>:null}
      <label className="block text-sm font-medium">Subject<input readOnly value={draft?.subject||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-2"/></label>
      <label className="block text-sm font-medium">Email body<textarea readOnly rows={23} value={draft?.body||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-3 font-mono text-xs leading-5"/></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(draft?.errors.length)} onClick={()=>void copy(`${draft?.subject}\n\n${draft?.body}`,"Inquiry")} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Copy inquiry</button>{chosen&&contactEmail(chosen)?<button type="button" onClick={()=>void copy(contactEmail(chosen),"Recipient email")} className="rounded-lg border px-4 py-2 text-sm">Copy recipient email</button>:null}</div>
      <p className="text-sm text-slate-600" role="status">{copyStatus||"No email will be sent from this page. Verify selected supplier, dates, recipient and signature."}</p>
    </div></div>:<p className="text-sm text-slate-600">No hotel stays found. Add a stay to begin.</p>}
    <button type="button" onClick={()=>{setStays(v=>[...v,{city:"",checkIn:"",checkOut:"",rooms:20,massRoom:false}]);setActive(stays.length)}} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">+ Add hotel stay</button>
  </div>;
}
