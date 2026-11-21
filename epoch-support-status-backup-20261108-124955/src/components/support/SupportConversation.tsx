"use client";
import { useCallback,useEffect,useState } from "react";
type Reply={id:string;authorRole:string;message:string;createdAt:string;emailDelivered:boolean};
export function SupportConversation({ticketId}:{ticketId:string}){
 const [replies,setReplies]=useState<Reply[]>([]);const [message,setMessage]=useState("");const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch(`/api/support/tickets/${ticketId}/replies`,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load replies");setReplies(d.replies||[]);}catch(e){setError(e instanceof Error?e.message:"Unable to load replies");}},[ticketId]);
 useEffect(()=>{void load()},[load]);
 async function submit(){setBusy(true);setError("");setNotice("");try{const r=await fetch(`/api/support/tickets/${ticketId}/replies`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save reply");setMessage("");setNotice(d.emailDelivered?"Reply saved and email sent.":"Reply saved, but email delivery was not confirmed. Contact the recipient by another channel.");await load();}catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}}
 return <section className="rounded-xl border bg-white p-5 space-y-4"><h3 className="text-lg font-semibold">Support conversation</h3>
  <div className="space-y-3">{replies.map(r=><div key={r.id} className="rounded-lg border bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-600">{r.authorRole==="ADMIN"?"Epoch Journeys Support":"Travel Agency"} · {new Date(r.createdAt).toLocaleString("en-GB")}</div><p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>{!r.emailDelivered&&<p className="mt-1 text-xs text-amber-800">Email delivery not confirmed</p>}</div>)}{replies.length===0&&<p className="text-sm text-slate-500">No replies yet.</p>}</div>
  <label className="block text-sm font-medium">Write a reply<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5} maxLength={8000} className="mt-2 w-full rounded-lg border p-3" placeholder="Your message to the other party"/></label>
  <button type="button" onClick={submit} disabled={busy||!message.trim()} className="rounded-lg bg-red-900 px-4 py-2 text-sm text-white disabled:opacity-40">{busy?"Saving...":"Save reply and send email"}</button>
  {notice&&<p role="status" className="text-sm text-amber-900">{notice}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </section>;
}
