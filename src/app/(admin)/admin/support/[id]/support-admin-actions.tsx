"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SupportAdminActions({id, initialStatus}: {id:string;initialStatus:string}) {
  const router = useRouter();
  const [status,setStatus] = useState(initialStatus);
  const [busy,setBusy] = useState(false);
  const [draft,setDraft] = useState("");
  const [error,setError] = useState("");
  async function changeStatus(next:string) {
    setBusy(true);setError("");
    try { const r=await fetch(`/api/admin/support/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not update status");setStatus(next);router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}
  }
  async function generateDraft(){setBusy(true);setError("");try{
    const r=await fetch(`/api/admin/support/${id}/ai-draft`,{method:"POST"});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"AI unavailable");setDraft(data.draft||"");
  }catch(e){setError(e instanceof Error?e.message:"Draft failed");}finally{setBusy(false);}}
  return <div className="rounded-xl border bg-white p-6 space-y-4">
    <h2 className="font-semibold text-xl">Admin actions</h2>
    <p className="text-sm text-slate-600">AI-generated text is a draft only. Review it and paste the final wording into the Support conversation below. Nothing is sent automatically.</p>
    <div className="flex flex-wrap gap-3">
      {["OPEN","IN_PROGRESS","RESOLVED"].map(s=><button key={s} disabled={busy||status===s} onClick={()=>changeStatus(s)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">{s.replaceAll("_"," ")}</button>)}
      <button disabled={busy} onClick={generateDraft} className="rounded-lg bg-red-900 px-4 py-2 text-sm text-white disabled:opacity-40">Draft reply with Epoch AI</button>
    </div>
    {draft&&<div><label className="block font-semibold text-sm mb-2">Review AI suggestion — not sent</label><textarea className="w-full rounded-lg border p-3 text-sm" rows={9} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>navigator.clipboard.writeText(draft)}>Copy draft</button></div>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
