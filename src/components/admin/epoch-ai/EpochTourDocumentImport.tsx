"use client";

import { useState } from "react";
import type { TourImportDraft } from "@/lib/epoch-ai/tourImportDraft";

type Props = { onApply: (draft: TourImportDraft) => void; workingDraftMode?: boolean };

export default function EpochTourDocumentImport({ onApply, workingDraftMode = false }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TourImportDraft | null>(null);
  const [source, setSource] = useState("");

  async function analyze() {
    if (!file || working) return;
    setWorking(true); setError(""); setDraft(null);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/admin/epoch-ai/tour-import", { method: "POST", body, cache: "no-store" });
      const result = await response.json() as { error?: string; draft?: TourImportDraft; fileName?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "Document analysis failed.");
      setDraft(result.draft); setSource(result.fileName ?? file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze document.");
    } finally { setWorking(false); }
  }

  function apply() {
    if (!draft) return;
    if (!window.confirm(workingDraftMode ? "Replace the temporary working draft with this imported itinerary? Nothing will be saved or published." : "Insert the imported draft into this form? Existing title, destinations, duration and itinerary will be replaced. Nothing is saved until you click Create Journey.")) return;
    onApply(draft);
    setDraft(null); setError("");
  }

  return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
    <h3 className="font-bold text-[#001F3F]">Import itinerary from Word or PDF</h3>
    <p className="mt-1 text-sm text-slate-700">Read-only AI extraction. Review the preview before inserting into the Tour form. No tour is created or published automatically.</p>
    <input className="mt-4 block w-full text-sm" type="file" accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setDraft(null); setError(""); }} />
    <button className="mt-3 rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="button" disabled={!file || working} onClick={analyze}>{working ? "Analyzing document..." : "Analyze itinerary"}</button>
    {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    {draft && <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
      <p className="text-xs text-slate-600">Source: {source}</p>
      <p className="mt-2 font-bold">{draft.title}</p>
      <p className="mt-1">{draft.duration} days · {draft.destinations.join(", ")} · Arrival: {draft.arrivalCity || "Unspecified"} · Departure: {draft.departureCity || "Unspecified"}</p>
      <p className="mt-2 text-xs font-medium">{draft.sourceDayCount} numbered days detected · Hotel nights from document: {draft.hotelNights ?? "Unconfirmed"} · Day 1: {({ overnight_flight: "Overnight flight; arrival Day 2", same_day_flight_and_arrival: "Flight and arrival on Day 1", arrival_only: "Arrival on Day 1", unclear: "Unclear — review source" } as const)[draft.dayOnePattern]}.</p>
      <p className="mt-1 text-xs text-slate-600">These are document-derived values, not a recalculation using the AI Itinerary Designer defaults. Verify against the source.</p>
      <details className="mt-3"><summary className="cursor-pointer font-semibold">Preview extracted itinerary</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-sans text-xs">{draft.itinerary}</pre></details>
      {draft.reviewNotes.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p className="font-semibold">Needs your verification</p><ul className="mt-1 list-disc space-y-1 pl-5">{draft.reviewNotes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
      <button className="mt-4 rounded-lg bg-[#8B0000] px-4 py-2 font-semibold text-white" type="button" onClick={apply}>{workingDraftMode ? "Apply Import to Working Draft" : "Insert into Tour form (not saved)"}</button>
    </div>}
  </section>;
}
