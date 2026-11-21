"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { leadsForCity, hotelResearchSearchUrl, compareLeadToCrm } from "@/lib/epoch-ai/hotelDiscoveryLeads";
import { leadEvidence, screenGroupCapacity } from "@/lib/epoch-ai/hotelLeadScreening";
import { balkanStays, contactEmail, inquiry, matchingHotels, nights, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";

export default function HotelProcurementPilot({tourTitle,destinations,hotels}:{tourTitle:string;destinations:string[];hotels:HotelContact[]}) {
  const isBalkan=/balkan|mother teresa/i.test(tourTitle);
  const [stays,setStays]=useState<Stay[]>(()=>isBalkan?balkanStays.map(s=>({...s})):destinations.slice(0,20).map(city=>({city,checkIn:"",checkOut:"",rooms:20,massRoom:false})));
  const [active,setActive]=useState(0);
  const [supplierId,setSupplierId]=useState<Record<number,string>>({});
  const [leadByStay,setLeadByStay]=useState<Record<number,string>>({});
  const [manualLead,setManualLead]=useState<Record<number,string>>({});
  const [verifiedEmail,setVerifiedEmail]=useState<Record<number,string>>({});
  const [checkStatus,setCheckStatus]=useState<Record<number,Record<string,boolean>>>({});
  const researchChecklist = ["20 rooms / allotment confirmed", "4-star standard verified", "Walk-in showers and lifts confirmed", "Coach access and parking confirmed", "Group dinners and beverages confirmed", "Porterage confirmed", "Private Mass room confirmed where required"];

  const [copyStatus,setCopyStatus]=useState("");
  const stay=stays[active];
  const matches=useMemo(()=>stay?matchingHotels(stay.city,hotels):[],[stay,hotels]);
  const chosen=hotels.find(h=>h.id===supplierId[active]);
  const selectedLeadName=manualLead[active]?.trim() || leadByStay[active] || "";
  const draft=stay?inquiry(stay,chosen?.name||selectedLeadName):null;
  const selectedName=chosen?.name||selectedLeadName;
  const leadEmail=verifiedEmail[active]?.trim()||"";
  const sourcedLeads=stay?leadsForCity(stay.city):[];
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
      <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
        <h3 className="font-bold text-[#001F3F]">Discover hotels not yet in Supplier CRM</h3>
        <p className="text-xs leading-5 text-slate-600">Chain and capacity screening first; these are still research leads, not approved suppliers. Published room counts are property totals, not a confirmed group allotment. Verify reviews, room types, access, contacts and rates. No CRM record or email is created.</p>
        {sourcedLeads.length ? <div className="space-y-2">{sourcedLeads.map(lead=><div key={lead.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-2 text-sm">
          <span className="flex-1">{lead.name}{compareLeadToCrm(lead.name,hotels.map(h=>h.name)) ? <span className="ml-2 text-xs text-amber-700">Check CRM for duplicate</span> : null}
            {(() => { const evidence=leadEvidence(lead.name); const size=screenGroupCapacity(stay.rooms,evidence?.totalRooms); return <span className="mt-1 block text-xs text-slate-600">{evidence ? `${evidence.brand} · ${evidence.totalRooms} published rooms · requested ${size.sharePercent}% of total` : "Hotel size and brand not yet independently verified"} <strong className={size.status==="capacity-caution"?"text-amber-700":"text-slate-600"}>{size.status==="capacity-caution"?"Capacity caution":size.status==="unknown"?"Research needed":"Initial size screen passed"}</strong>{evidence?.note?<span className="block text-amber-800">{evidence.note}</span>:null}{evidence?<a className="ml-1 text-blue-700 underline" target="_blank" rel="noopener noreferrer" href={evidence.source}>Official/brand source</a>:null}</span>; })()}
          </span>
          <span className="flex flex-wrap gap-2"><a href={hotelResearchSearchUrl(stay.city,lead.name)} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Research</a><button type="button" className="rounded border bg-white px-2 py-1 text-xs font-semibold" onClick={()=>{setLeadByStay(p=>({...p,[active]:lead.name}));setManualLead(p=>({...p,[active]:""}));setSupplierId(p=>({...p,[active]:""}));setVerifiedEmail(p=>({...p,[active]:""}));setCopyStatus("")}}>Use lead</button></span>
        </div>)}</div> : <p className="text-xs text-slate-600">No curated leads for this destination. Research hotels and enter a hotel name below.</p>}
        <label className="block text-sm font-medium">Other researched hotel (optional)<input value={manualLead[active]||""} onChange={e=>{setManualLead(p=>({...p,[active]:e.target.value}));setSupplierId(p=>({...p,[active]:""}));setCopyStatus("")}} placeholder="Enter the exact verified hotel name" className="mt-1 w-full rounded-lg border bg-white p-2" /></label>
        {selectedName ? <div className="space-y-2 rounded-lg border bg-white p-3"><p className="text-sm"><strong>Selected:</strong> {selectedName} {chosen?"(CRM)":"(research lead — not yet in CRM)"}</p>
          <label className="block text-sm font-medium">Verified reservations email (optional; no sending)<input type="email" value={verifiedEmail[active]||""} onChange={e=>setVerifiedEmail(p=>({...p,[active]:e.target.value}))} placeholder="Only enter after checking an official source" className="mt-1 w-full rounded-lg border p-2"/></label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><strong>Preliminary capacity screen:</strong> {screenGroupCapacity(stay.rooms,leadEvidence(selectedName)?.totalRooms).message} {leadEvidence(selectedName)?.totalRooms ? `(${stay.rooms} rooms requested / ${leadEvidence(selectedName)?.totalRooms} published rooms)` : ""} <span className="block mt-1">Do not mark the 20-room allotment confirmed until the hotel replies.</span></div>
          <p className="text-xs font-semibold text-slate-700">Supplier diligence checklist (your verification)</p>
          {researchChecklist.filter(s=>!s.includes("Mass room")||stay.massRoom).map(item=><label key={item} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={Boolean(checkStatus[active]?.[item])} onChange={e=>setCheckStatus(prev=>({...prev,[active]:{...(prev[active]||{}),[item]:e.target.checked}}))}/>{item}</label>)}
          <p className="text-xs text-slate-600">Selected lead and checks stay in this browser session only. The inquiry draft remains unchanged until your approval. Confirm contact details before copying or sending.</p>
        </div>:null}
      </section>

    </div><div className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-[#001F3F]">Approved hotel inquiry — draft only</h2>
      <p className="text-sm text-slate-700">Hotel to approach: <strong>{selectedName || "Not selected"}</strong>. Contact email: <strong>{chosen?contactEmail(chosen)||"Not in CRM":leadEmail||"Not verified"}</strong>.</p>
      {draft?.errors.length?<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{draft.errors.join("; ")}</div>:null}
      <label className="block text-sm font-medium">Subject<input readOnly value={draft?.subject||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-2"/></label>
      <label className="block text-sm font-medium">Email body<textarea readOnly rows={23} value={draft?.body||""} className="mt-1 w-full rounded-lg border bg-slate-50 p-3 font-mono text-xs leading-5"/></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(draft?.errors.length)||!selectedName} onClick={()=>void copy(`Selected hotel: ${selectedName}\nRecipient: ${chosen?contactEmail(chosen):leadEmail||"CONTACT NOT VERIFIED"}\n\n${draft?.subject}\n\n${draft?.body}`,"Inquiry")} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Copy inquiry</button>{(chosen?contactEmail(chosen):leadEmail)?<button type="button" onClick={()=>void copy(chosen?contactEmail(chosen):leadEmail,"Recipient email")} className="rounded-lg border px-4 py-2 text-sm">Copy recipient email</button>:null}</div>
      <p className="text-sm text-slate-600" role="status">{copyStatus||"Select a hotel or research lead before copying. No email is sent from this page."}</p>
    </div></div>:<p className="text-sm text-slate-600">No hotel stays found. Add a stay to begin.</p>}
    <button type="button" onClick={()=>{setStays(v=>[...v,{city:"",checkIn:"",checkOut:"",rooms:20,massRoom:false}]);setActive(stays.length)}} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">+ Add hotel stay</button>
  </div>;
}
