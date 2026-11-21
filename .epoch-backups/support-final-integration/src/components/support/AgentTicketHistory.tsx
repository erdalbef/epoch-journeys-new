"use client";
import { useEffect,useState } from "react";
import { SupportConversation } from "@/components/support/SupportConversation";
type Ticket={id:string;subject:string;status:string;createdAt:string;message:string;attachmentName:string|null;label?:string;lastActivity?:string};
export function AgentTicketHistory(){
  const [tickets,setTickets]=useState<Ticket[]>([]);const [error,setError]=useState("");const [expanded,setExpanded]=useState<string|null>(null);
  useEffect(()=>{let active=true;fetch("/api/b2b/support",{cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Unavailable");if(active)setTickets(data.tickets||[])}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
  return <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">My Support Requests</h2>
    <p className="mt-1 text-sm text-slate-600">Requests are visible only to your agency login. Open a request to read the conversation and send another message.</p>
    {error&&<p className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 space-y-3">{tickets.map(t=><div className="rounded-lg border p-4" key={t.id}>
      <div className="flex flex-wrap justify-between gap-2"><b>{t.subject}</b><span className="text-xs font-medium">{t.status.replaceAll("_"," ")} · {t.label || "Awaiting Admin"}</span></div>
      <p className="text-xs text-slate-500">Last activity: {new Date(t.lastActivity || t.createdAt).toLocaleString("en-GB")}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>
      {t.attachmentName&&<a className="text-sm text-red-800 underline" href={`/api/support/attachments/${t.id}`}>Download attachment</a>}
      <div className="mt-3"><button className="rounded-md border px-3 py-2 text-sm" onClick={()=>setExpanded(expanded===t.id?null:t.id)}>{expanded===t.id?"Hide conversation":"View conversation / Reply"}</button></div>
      {expanded===t.id&&<div className="mt-3"><SupportConversation ticketId={t.id}/></div>}
    </div>)}{!tickets.length&&!error&&<p className="text-sm text-slate-500">No support requests found. Newly submitted requests appear after refresh.</p>}</div>
  </section>;
}
