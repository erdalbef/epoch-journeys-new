"use client";

import { FormEvent, useState } from "react";

type Candidate = {
  id: string; sourceType: string; sourceReference: string; scope: string;
  version: number; recordedAcceptanceStatus: string; recordedReviewStatus: string;
};
type Preliminary = {
  supplier: string; currency: string; payableId: string;
  financials: {approvedAmount: string};
  commercialEvidence?: {candidates: Candidate[]};
};
type Finding = {code:string;severity:string;message:string;agreementEvidence:string|null;invoiceEvidence:string|null;estimatedDifference:string|null};
type Analysis = {
  verificationStatus: string; source: { reference:string; version:number;recordedAcceptance:string };
  comparison: {findings:Finding[]}; limitations: string[];
};

export default function CommercialTermsPage() {
  const [payableId, setPayableId] = useState("");
  const [audit, setAudit] = useState<Preliminary|null>(null);
  const [selected, setSelected] = useState("");
  const [analysis, setAnalysis] = useState<Analysis|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(event: FormEvent) {
    event.preventDefault();
    setError(""); setAudit(null); setSelected(""); setAnalysis(null);
    if (!payableId.trim()) {setError("Enter a supplier payable ID.");return;}
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/epoch-ai/finance/supplier-invoice-audit?payableId=${encodeURIComponent(payableId.trim())}`, {cache:"no-store"});
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load payable evidence.");
      setAudit(json.result as Preliminary);
    } catch (issue) {setError(issue instanceof Error?issue.message:"Unable to load records.");}
    finally {setBusy(false);}
  }
  async function analyze() {
    if (!audit || !selected) return;
    setBusy(true);setError("");setAnalysis(null);
    try {
      const response = await fetch("/api/admin/epoch-ai/finance/commercial-terms/analyze",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({payableId:audit.payableId,evidenceId:selected}),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Commercial terms comparison unavailable.");
      setAnalysis(json as Analysis);
    } catch(issue) {setError(issue instanceof Error?issue.message:"Analysis failed.");}
    finally {setBusy(false);}
  }
  const candidates = (audit?.commercialEvidence?.candidates ?? []).filter(x => x.scope === "LINKED_TO_PAYABLE" &&
    x.recordedAcceptanceStatus !== "REJECTED" && x.recordedAcceptanceStatus !== "SUPERSEDED");
  return <main className="mx-auto max-w-5xl space-y-5 p-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Epoch AI / Finance intelligence</p>
      <h1 className="mt-2 text-2xl font-bold text-[#001F3F]">Supplier commercial terms review</h1>
      <p className="mt-2 text-sm text-slate-600">Read-only pilot: compare one payable-linked private PDF offer or agreement against one private PDF supplier invoice. AI findings are preliminary and must be checked against the original documents.</p>
    </header>
    <form onSubmit={review} className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm font-semibold">
        Supplier payable ID
        <input value={payableId} onChange={e=>setPayableId(e.target.value)} className="rounded-lg border px-3 py-2 font-normal" placeholder="Copy ID from Supplier Payables detail URL" maxLength={128} />
      </label>
      <button className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">Load evidence</button>
    </form>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {audit && <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="font-bold">{audit.supplier} · Approved {audit.financials.approvedAmount} {audit.currency}</h2>
      <p className="text-sm text-slate-600">Only documents registered specifically to this payable may be selected. Supplier-wide offers, superseded versions and rejected sources are excluded.</p>
      {candidates.length===0 ? <p className="text-sm text-amber-800">No eligible payable-linked evidence registration is available. Register a PDF source before using this pilot.</p> : <>
        <label className="block text-sm font-semibold" htmlFor="commercial-source">Agreement / offer candidate</label>
        <select id="commercial-source" className="w-full rounded-lg border p-2 text-sm" value={selected} onChange={e=>{setSelected(e.target.value);setAnalysis(null);}}>
          <option value="">Select a source</option>
          {candidates.map(c=><option key={c.id} value={c.id}>{c.sourceType} · {c.sourceReference} · v{c.version} · {c.recordedAcceptanceStatus}</option>)}
        </select>
        <button type="button" disabled={busy || !selected} onClick={()=>void analyze()} className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Analyzing...":"Compare PDF terms (AI)"}</button>
      </>}
    </section>}
    {analysis && <section className="space-y-4 rounded-xl border bg-white p-5" aria-live="polite">
      <h2 className="text-lg font-bold">Preliminary commercial terms findings</h2>
      <p className="text-sm text-amber-800">Source: {analysis.source.reference} · version {analysis.source.version} · recorded acceptance: {analysis.source.recordedAcceptance}. These findings are not invoice approval or acceptance verification.</p>
      {analysis.comparison.findings.map((f,idx)=><article key={`${f.code}-${idx}`} className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-semibold">{f.severity}: {f.message}</p>
        {f.estimatedDifference!==null && <p className="text-xs text-slate-700">Possible unit difference: {f.estimatedDifference} (not a total overcharge calculation)</p>}
        <p className="text-xs text-slate-700"><strong>Agreement evidence:</strong> {f.agreementEvidence??"Not supplied"}</p>
        <p className="text-xs text-slate-700"><strong>Invoice evidence:</strong> {f.invoiceEvidence??"Not supplied"}</p>
      </article>)}
      <div className="text-xs text-slate-600"><strong>Limitations:</strong> {analysis.limitations.join(" ")}</div>
    </section>}
  </main>;
}
