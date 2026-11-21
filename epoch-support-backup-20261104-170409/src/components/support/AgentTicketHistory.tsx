"use client";
import { useEffect,useState } from "react";
type Ticket={id:string;subject:string;status:string;createdAt:string;message:string;attachmentName:string|null};
export function AgentTicketHistory(){
  const [tickets,setTickets]=useState<Ticket[]>([]);const [error,setError]=useState("");
  useEffect(()=>{let active=true;fetch("/api/b2b/support",{cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Unavailable");if(active)setTickets(data.tickets||[])}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
  return <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">My Support Requests</h2>
    <p className="mt-1 text-sm text-slate-600">Requests are visible only to your agency login. Replies are not yet available in this first release.</p>
    {error&&<p className="mt-3 text-red-700">{error}</p>}
    <div className="mt-4 space-y-3">{tickets.map(t=><div className="rounded-lg border p-4" key={t.id}>
      <div className="flex flex-wrap justify-between gap-2"><b>{t.subject}</b><span className="text-xs font-medium">{t.status}</span></div>
      <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString("en-GB")}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>
      {t.attachmentName&&<a className="text-sm text-red-800 underline" href={`/api/support/attachments/${t.id}`}>Download attachment</a>}
    </div>)}{!tickets.length&&!error&&<p className="text-sm text-slate-500">No support requests found. Newly submitted requests appear after refresh.</p>}</div>
  </section>;
}
