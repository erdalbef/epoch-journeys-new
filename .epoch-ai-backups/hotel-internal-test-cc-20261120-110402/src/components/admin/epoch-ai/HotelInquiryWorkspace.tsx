"use client";
import { useEffect, useState } from "react";
import { contactEmail, inquiry, type HotelContact, type Stay } from "@/lib/epoch-ai/hotelProcurement";
import { splitHotelInquiryHistory } from "@/lib/epoch-ai/hotelInquiryApprovalGate";

type Entry={id:string;supplierId:string;recipient:string;subject:string;body:string;destination:string;checkIn:string;checkOut:string;rooms:number;status:string;createdAt:string;approvedAt:string|null;supplier:{name:string}};
export default function HotelInquiryWorkspace({tourId,hotel,stay}:{tourId:string;hotel:HotelContact;stay:Stay}) {
 const template=inquiry(stay,hotel.name);
 const [recipient,setRecipient]=useState(contactEmail(hotel));
 const [subject,setSubject]=useState(template.subject);
 const [body,setBody]=useState(template.body);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [readiness,setReadiness]=useState<Record<string,{ready:boolean;checks:string[];blocks:string[]}>>({});
 const [showHistory,setShowHistory]=useState(false);
 const [testResults,setTestResults]=useState<Record<string,{status:string;providerMessageId?:string|null}>>({});
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
   const json=await res.json() as {error?:string;blocks?:string[]};if(!res.ok)throw Error([json.error||"Could not save draft",...(json.blocks||[])].join(" | "));
   setMessage("Inquiry DRAFT saved to development database. Not approved or sent.");await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}
 }
 async function approveDraft(entry:Entry){
  if(!window.confirm(`Approve the saved inquiry snapshot for ${hotel.name}?\nRecipient: ${entry.recipient}\nSubject: ${entry.subject}\nSaved stay: ${entry.checkIn} to ${entry.checkOut}; ${entry.rooms} rooms\n\nApproval freezes the saved message; NO EMAIL IS SENT.`))return;
  setBusy(true);setMessage("");
  try {
   const res=await fetch(`/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(entry.id)}/approve`,{method:"POST"});
   const json=await res.json() as {error?:string;blocks?:string[]};if(!res.ok)throw Error([json.error||"Approval failed",...(json.blocks||[])].join(" | "));
   setMessage("Inquiry approved and frozen. No email sent.");await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Approval failed");}finally{setBusy(false);}
 }
 async function checkSendReadiness(entry:Entry){
  setBusy(true);setMessage("");
  try {
   const res=await fetch(`/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(entry.id)}/send-readiness`,{cache:"no-store"});
   const json=await res.json() as {ready:boolean;checks:string[];blocks:string[];error?:string};
   if(!res.ok)throw Error(json.error||"Could not verify readiness");
   setReadiness(p=>({...p,[entry.id]:json}));
   setMessage(json.ready?"Inquiry passes content review. Sending is still disabled until delivery tracking is installed.":"Send readiness blocked. Review the issues listed below and create a revised draft.");
  } catch(e){setMessage(e instanceof Error?e.message:"Readiness check failed");}
  finally{setBusy(false);}
 }
 function createRevisedDraft(){
  const fresh=inquiry(stay,hotel.name);
  setRecipient(contactEmail(hotel));setSubject(fresh.subject);setBody(fresh.body);
  setMessage("Revised text loaded into the editor. Save as a NEW draft; earlier approved records remain unchanged.");
 }
 async function sendTest(entry:Entry){
  if(window.prompt(`TEST ONLY — Send approved inquiry to erdal@epochjourneys.com?\n\nHotel: ${hotel.name}\nSubject: ${entry.subject}\n\nType SEND TEST to authorize this single test:`)!=="SEND TEST")return;
  setBusy(true);setMessage("");
  try{
   const res=await fetch(`/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(entry.id)}/test-email`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation:"SEND TEST"})});
   const json=await res.json() as {error?:string;status?:string;providerMessageId?:string|null};
   if(!res.ok)throw Error(json.error||"Test email request was not accepted");
   setTestResults(x=>({...x,[entry.id]:{status:json.status||"UNKNOWN",providerMessageId:json.providerMessageId}}));
   setMessage(json.status==="ACCEPTED"?"Provider accepted TEST email for erdal@epochjourneys.com. Check inbox; this is NOT proof of final delivery.":`Test attempt recorded: ${json.status}. Do NOT retry automatically.`);
  }catch(e){setMessage(e instanceof Error?e.message:"Test email failed or outcome unknown. Do NOT retry blindly.");}
  finally{setBusy(false);}
 }
 const {current,historical}=splitHotelInquiryHistory(entries,{supplierId:hotel.id,destination:stay.city,checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms});
 function entryDetails(entry:Entry,actionable:boolean){return <div key={entry.id} className="space-y-1 border-b py-3 text-xs">
  <p><strong>{entry.status}</strong> · {new Date(entry.createdAt).toLocaleString()} · {entry.recipient}</p><p>{entry.subject}</p>
  <p className="text-slate-700">Saved stay: <strong>{entry.destination} · {entry.checkIn} to {entry.checkOut} · {entry.rooms} rooms</strong></p>
  {!actionable?<p className="font-semibold text-slate-600">Historical / superseded in this view — preserved read-only. No records deleted.</p>:null}
  <details className="rounded border bg-white p-2"><summary className="cursor-pointer font-semibold">Inspect exact saved message (read-only)</summary><pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{entry.body}</pre></details>
  {actionable&&entry.status==="DRAFT"?<button type="button" disabled={busy} onClick={()=>void approveDraft(entry)} className="rounded border border-slate-400 bg-white px-3 py-1 font-semibold disabled:opacity-40">Approve saved draft (no send)</button>:null}
  {actionable&&entry.status==="APPROVED"?<div className="space-y-2"><p className="font-medium text-green-800">Approved — not sent to supplier</p><button type="button" disabled={busy} onClick={()=>void checkSendReadiness(entry)} className="rounded border border-blue-400 bg-white px-3 py-1 font-semibold disabled:opacity-40">Check send readiness (no send)</button><button type="button" disabled={busy} onClick={()=>void sendTest(entry)} className="ml-2 rounded border border-amber-600 bg-amber-50 px-3 py-1 font-semibold text-amber-950 disabled:opacity-40">Send TEST to Epoch inbox only</button>{testResults[entry.id]?<p>Test provider status: {testResults[entry.id].status}{testResults[entry.id].providerMessageId?` · ${testResults[entry.id].providerMessageId}`:""}</p>:null}{readiness[entry.id]?<div className="rounded border bg-white p-2"><p className="font-semibold">{readiness[entry.id].ready?"Content checks passed — supplier delivery disabled":"Not ready to send"}</p>{readiness[entry.id].blocks.map((b,i)=><p key={i} className="text-red-800">• {b}</p>)}{readiness[entry.id].checks.map((c,i)=><p key={i} className="text-slate-700">✓ {c}</p>)}</div>:null}</div>:null}
 </div>}
 return <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
  <h3 className="font-bold text-[#001F3F]">Hotel inquiry history · {hotel.name}</h3>
  <p className="text-xs text-amber-800">Development only. Saving creates a draft record; approval freezes it. Neither action sends email. Review the official signature before approving. Test emails go ONLY to erdal@epochjourneys.com and require separate confirmation.</p>
  <label className="block text-sm font-medium">Recipient email<input type="email" className="mt-1 w-full rounded border bg-white p-2" value={recipient} onChange={e=>setRecipient(e.target.value)}/></label>
  <label className="block text-sm font-medium">Email subject<input className="mt-1 w-full rounded border bg-white p-2" value={subject} onChange={e=>setSubject(e.target.value)}/></label>
  <label className="block text-sm font-medium">Inquiry body to save<textarea rows={16} className="mt-1 w-full rounded border bg-white p-2 font-mono text-xs" value={body} onChange={e=>setBody(e.target.value)}/></label>
  {template.errors.length?<p role="alert" className="text-xs text-red-700">{template.errors.join("; ")}</p>:null}
  <button type="button" disabled={busy} onClick={createRevisedDraft} className="rounded border border-slate-400 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">Create Revised Draft (reload template)</button>
  <button type="button" disabled={busy||Boolean(template.errors.length)} onClick={()=>void saveDraft()} className="rounded bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save inquiry as DRAFT (no send)</button>
  <div className="border-t pt-3"><h4 className="text-sm font-bold">Current inquiry for this hotel and stay</h4>
   {loading?<p className="text-xs">Loading…</p>:current?entryDetails(entries.find(e=>e.id===current.id)!,true):<p className="text-xs text-slate-600">No current inquiry for these stay dates. Create a new validated draft above.</p>}
   <button type="button" onClick={()=>setShowHistory(v=>!v)} className="mt-3 rounded border border-slate-400 bg-white px-3 py-2 text-xs font-semibold">{showHistory?"Hide Full History":"View Full History"} ({historical.length} older records)</button>
   {showHistory?<div className="mt-2"><p className="text-xs text-slate-600">Older drafts and approvals are retained as immutable evidence. “Historical” is a display label, not a database status change.</p>{historical.map(item=>entryDetails(entries.find(e=>e.id===item.id)!,false))}</div>:null}
  </div>
  {message?<p role="status" className="text-xs font-medium text-slate-800">{message}</p>:null}
 </section>;
}
