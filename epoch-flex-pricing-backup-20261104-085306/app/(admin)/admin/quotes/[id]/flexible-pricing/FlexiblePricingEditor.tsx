"use client";
import {useState} from "react";
type Tier={payingPilgrims:number;complimentaryPilgrims:number;single:number;doubleTwin:number;triple:number|null;note:string};
const blank=():Tier=>({payingPilgrims:30,complimentaryPilgrims:0,single:0,doubleTwin:0,triple:null,note:""});
export default function FlexiblePricingEditor({id,initial,enabled}:{id:string;initial:Tier[];enabled:boolean}) {
 const [tiers,setTiers]=useState<Tier[]>(initial.length?initial:[blank()]);
 const [active,setActive]=useState(enabled);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const change=(i:number,key:keyof Tier,value:string)=>setTiers(old=>old.map((t,j)=>j===i?{...t,[key]:key==="note"?value:key==="triple"&&value===""?null:Number(value)}:t));
 async function save(enabled:boolean){setBusy(true);setMessage("");try{
 const r=await fetch(`/api/quotes/${encodeURIComponent(id)}/flexible-pricing`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled,tiers})});
 const result=await r.json();if(!r.ok)throw new Error(result.error||"Save failed");setActive(enabled);setMessage(enabled?"Approved. Regenerate the Agent PDF to include the link.":"Alternative pricing unpublished.");
 }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}}
 return <div className="space-y-5"><p className="text-sm text-amber-800">Do not approve calculated rows without verifying costs, COMPs and room allocations for each group size.</p>
 {tiers.map((t,i)=><div className="rounded-lg border p-4" key={i}><div className="mb-3 flex justify-between"><strong>Alternative {i+1}</strong><button type="button" onClick={()=>setTiers(v=>v.filter((_,j)=>j!==i))} className="text-red-700">Remove</button></div>
 <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{([['payingPilgrims','Paying pilgrims'],['complimentaryPilgrims','Complimentary pilgrims'],['doubleTwin','NET Double/Twin'],['single','NET Single'],['triple','NET Triple (optional)']] as const).map(([key,label])=><label className="text-sm" key={key}>{label}<input className="mt-1 w-full rounded border p-2" type="number" min="0" step={key.includes('Pilgrims')?'1':'0.01'} value={t[key]??""} onChange={e=>change(i,key,e.target.value)}/></label>)}</div>
 <label className="mt-3 block text-sm">Conditions / notes<input className="mt-1 w-full rounded border p-2" value={t.note} onChange={e=>change(i,"note",e.target.value)}/></label></div>)}
 <div className="flex flex-wrap gap-3"><button className="rounded border px-4 py-2" onClick={()=>setTiers(v=>[...v,blank()])} disabled={tiers.length>=12}>Add alternative</button><button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={()=>save(true)} disabled={busy||!tiers.length}>Approve and publish</button><button className="rounded border px-4 py-2" onClick={()=>save(false)} disabled={busy}>Unpublish</button></div>
 <p role="status" className="text-sm">{message || (active?"Currently approved":"Not published")}</p></div>;
}
