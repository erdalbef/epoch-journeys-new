"use client";
import { useEffect, useState } from "react";
import { contactEmail, inquiry, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";

type Entry={id:string;supplierId:string;recipient:string;subject:string;status:string;createdAt:string;approvedAt:string|null;supplier:{name:string}};
export default function HotelInquiryWorkspace({tourId,hotel,stay}:{tourId:string;hotel:HotelContact;stay:Stay}) {
 const template=inquiry(stay,hotel.name);
 const [recipient,setRecipient]=useState(contactEmail(hotel));
 const [subject,setSubject]=useState(template.subject);
 const [body,setBody]=useState(template.body);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 async function refresh(){
  try {
   const res=await fetch(`/api/admin/epoch-ai/hotel-inquiries?tourId=${encodeURIComponent(tourId)}`,{cache:"no-store"});
   const json=await res.json() as {entries?:Entry[];error?:string};
   if(!res.ok)throw Error(json.error||"Inquiry history unavailable");
   setEntries((json.entries||[]).filter(e=>e.supplierId===hotel.id));
  } catch(e){setMessage(e instanceof Error?e.message:"Cannot load inquiry history");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[tourId,hotel.id]);
 async function saveDraft(){
  if(template.errors.length){setMessage(template.errors.join("; "));return;}
  if(!window.confirm(`Save an inquiry DRAFT for ${hotel.name} to ${recipient}?\nNo email will be sent.`))return;
  setBusy(true);setMessage("");
  try {
   const res=await fetch("/api/admin/epoch-ai/hotel-inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tourId,supplierId:hotel.id,stay,recipient,subject,body})});
   const json=await res.json() as {error?:string};if(!res.ok)throw Error(json.error||"Could not save draft");
   setMessage("Inquiry DRAFT saved to development database. Not approved or sent.");await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}
 }
 async function approveDraft(entry:Entry){
  if(!window.confirm(`Approve the saved inquiry snapshot for ${hotel.name}?\nRecipient: ${entry.recipient}\nSubject: ${entry.subject}\n\nApproval freezes the saved message; NO EMAIL IS SENT.`))return;
  setBusy(true);setMessage("");
  try {
   const res=await fetch(`/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(entry.id)}/approve`,{method:"POST"});
   const json=await res.json() as {error?:string};if(!res.ok)throw Error(json.error||"Approval failed");
   setMessage("Inquiry approved and frozen. No email sent.");await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Approval failed");}finally{setBusy(false);}
 }
 return <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
  <h3 className="font-bold text-[#001F3F]">Hotel inquiry history · {hotel.name}</h3>
  <p className="text-xs text-amber-800">Development only. Saving creates a draft record; approval freezes it. Neither action sends email. Check the recipient and replace the signature placeholder before approving.</p>
  <label className="block text-sm font-medium">Recipient email<input type="email" className="mt-1 w-full rounded border bg-white p-2" value={recipient} onChange={e=>setRecipient(e.target.value)}/></label>
  <label className="block text-sm font-medium">Email subject<input className="mt-1 w-full rounded border bg-white p-2" value={subject} onChange={e=>setSubject(e.target.value)}/></label>
  <label className="block text-sm font-medium">Inquiry body to save<textarea rows={16} className="mt-1 w-full rounded border bg-white p-2 font-mono text-xs" value={body} onChange={e=>setBody(e.target.value)}/></label>
  {template.errors.length?<p role="alert" className="text-xs text-red-700">{template.errors.join("; ")}</p>:null}
  <button type="button" disabled={busy||Boolean(template.errors.length)} onClick={()=>void saveDraft()} className="rounded bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save inquiry as DRAFT (no send)</button>
  <div className="border-t pt-3"><h4 className="text-sm font-bold">Saved inquiry history for this hotel</h4>
   {loading?<p className="text-xs">Loading…</p>:entries.length===0?<p className="text-xs text-slate-600">No saved inquiries for this hotel on this tour.</p>:entries.map(entry=><div key={entry.id} className="space-y-1 border-b py-3 text-xs"><p><strong>{entry.status}</strong> · {new Date(entry.createdAt).toLocaleString()} · {entry.recipient}</p><p>{entry.subject}</p>{entry.status==="DRAFT"?<button type="button" disabled={busy} onClick={()=>void approveDraft(entry)} className="rounded border border-slate-400 bg-white px-3 py-1 font-semibold disabled:opacity-40">Approve saved draft (no send)</button>:<p className="font-medium text-green-800">Approved — not sent</p>}</div>)}
  </div>
  {message?<p role="status" className="text-xs font-medium text-slate-800">{message}</p>:null}
 </section>;
}
