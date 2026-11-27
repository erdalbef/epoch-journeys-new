"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import {
  BrainCircuit, FileText, LoaderCircle, MessageSquareText,
  Search, ShieldCheck, Sparkles, X,
} from "lucide-react";

type RecordKind = "none" | "supplier" | "quote";
type Option = { id: string; label: string; detail: string };
type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Help me draft a practical 12-day Catholic pilgrimage itinerary with daily Mass and gentle walking.",
  "Review the selected supplier's hotel rates and point out any missing prices or reconfirmation risks.",
  "Review this quotation for pricing or service issues without changing its calculations.",
  "Summarize the attached document, extract key dates and costs, and identify items for approval.",
];

export default function EpochAiWorkspace() {
  const [kind, setKind] = useState<RecordKind>("none");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchRequest = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  function resetSearchResults() {
    searchRequest.current?.abort();
    searchRequest.current = null;
    setSearching(false);
    setSearchComplete(false);
    setSearchError("");
    setOptions([]);
  }

  async function findRecords(type: Exclude<RecordKind, "none">, query: string) {
    resetSearchResults();
    const request = new AbortController();
    searchRequest.current = request;
    setSearching(true);
    setSelected(null);
    setHistory([]);
    setError("");
    try {
      const params = new URLSearchParams({ type, q: query.trim() });
      const response = await fetch(`/api/admin/epoch-ai/context?${params}`, {
        cache: "no-store", signal: request.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.results)) {
        throw new Error(payload?.error || "Could not search records. Please try again.");
      }
      if (searchRequest.current === request) {
        setOptions(payload.results);
        setSearchComplete(true);
      }
    } catch (issue) {
      if (searchRequest.current === request) {
        setSearchError(issue instanceof Error ? issue.message : "Could not search records.");
      }
    } finally {
      if (searchRequest.current === request) {
        searchRequest.current = null;
        setSearching(false);
      }
    }
  }

  function changeKind(next: RecordKind) {
    setKind(next);
    setSearch("");
    if (next !== "none") {
      void findRecords(next, "");
      return;
    }
    resetSearchResults();
    setSelected(null);
    setHistory([]);
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 6 * 1024 * 1024) {
      setError("Document limit is 6 MB. Please choose a smaller file.");
      setDocument(null);
      event.target.value = "";
      return;
    }
    setDocument(file);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = question.trim();
    if (prompt.length < 2 || busy) return;
    if (kind !== "none" && !selected) {
      setError("Please select a supplier or quotation from search results first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("message", prompt);
      data.set("history", JSON.stringify(history.slice(-8).map((item) => ({ ...item, content: item.content.slice(0, 4000) }))));
      data.set("contextType", kind);
      data.set("contextId", selected?.id ?? "");
      if (document) data.set("document", document, document.name);
      const response = await fetch("/api/admin/epoch-ai/chat", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Epoch AI request failed.");
      const reply = typeof payload.answer === "string" ? payload.answer : "";
      if (!reply) throw new Error("Epoch AI returned an empty response.");
      const newMessages: Message[] = [
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ];
      setHistory((current) => [...current, ...newMessages].slice(-12));
      setQuestion("");
      setDocument(null);
      if (uploadRef.current) uploadRef.current.value = "";
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Epoch AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">Admin workspace</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-[#001F3F]">
            <BrainCircuit className="h-8 w-8" /> Epoch AI
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Ask questions, review records, analyze documents and prepare drafts. Nothing is saved to suppliers, quotations, bookings or accounting.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
          <ShieldCheck className="h-4 w-4 text-emerald-700" /> Read-only · Admin only
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#001F3F]"><Search className="h-4 w-4" /> Record context</h2>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">Choose a supplier or quotation when you want AI to review existing information. No other database records are shared.</p>
            <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="epoch-context-type">Select source</label>
            <select id="epoch-context-type" value={kind} onChange={(event) => changeKind(event.target.value as RecordKind)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="none">No record selected</option>
              <option value="supplier">Supplier CRM</option>
              <option value="quote">Quotation</option>
            </select>
            {kind !== "none" && (
              <div className="mt-3 space-y-3">
                <form className="flex gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  if (!searching) void findRecords(kind, search);
                }}>
                  <input value={search}
                    onChange={(event) => { setSearch(event.target.value); resetSearchResults(); }}
                    aria-label={kind === "supplier" ? "Search suppliers" : "Search quotations"}
                    placeholder={kind === "supplier" ? "Hotel / supplier name" : "Quote number, tour or destination"}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <button type="submit" disabled={searching}
                    className="rounded-xl bg-[#001F3F] px-3 text-xs font-semibold text-white disabled:opacity-50">
                    {searching ? "Finding…" : "Find"}
                  </button>
                </form>
                {searchError && <p role="alert" className="text-xs text-red-700">{searchError}</p>}
                {searchComplete && !options.length && (
                  <p role="status" className="text-xs text-slate-600">
                    {kind === "quote"
                      ? search.trim() ? "No saved quotations match this search." : "There are no saved quotations yet."
                      : search.trim() ? "No suppliers match this search." : "There are no suppliers yet."}
                  </p>
                )}
                {searchComplete && options.length > 0 && !search.trim() && (
                  <p className="text-xs font-semibold text-slate-600">{kind === "quote" ? "Recent quotations" : "Recently updated suppliers"}</p>
                )}
                {options.length > 0 && <div className="max-h-60 space-y-1 overflow-auto rounded-xl border border-slate-200 p-1">
                  {options.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setSelected(item); resetSearchResults(); setHistory([]); }}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100">
                      <span className="block text-xs font-semibold text-slate-800">{item.label}</span>
                      <span className="block text-[11px] text-slate-500">{item.detail}</span>
                    </button>
                  ))}
                </div>}
                {selected && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                  <p className="font-bold text-emerald-900">Selected: {selected.label}</p>
                  <p className="mt-1 text-emerald-800">{selected.detail}</p>
                  <button type="button" onClick={() => { void findRecords(kind, search); }} className="mt-2 font-semibold text-emerald-900 underline">Change selection</button>
                </div>}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#001F3F]"><FileText className="h-4 w-4" /> Document intelligence</h2>
            <p className="mb-3 text-xs leading-relaxed text-slate-600">Attach one PDF, DOCX, XLSX, TXT, MD or CSV file (up to 6 MB). PDF pages are processed by the AI model; text files and office document contents are extracted first.</p>
            <input ref={uploadRef} type="file" accept=".pdf,.docx,.xlsx,.txt,.md,.csv" onChange={onFileChange}
              className="block w-full text-xs text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
            {document && <button type="button" onClick={() => { setDocument(null); if (uploadRef.current) uploadRef.current.value = ""; }}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-[#8B0000]"><X className="h-3 w-3" /> Remove {document.name}</button>}
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Files are sent for this request only. They are not saved in Epoch AI. Reattach for detailed follow-up analysis. Scanned Office files may need OCR outside this initial version.</p>
          </section>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#001F3F]"><MessageSquareText className="h-5 w-5" /> Assistant</div>
            <button type="button" onClick={() => { setHistory([]); setError(""); }} className="text-xs font-semibold text-[#8B0000] hover:underline">New conversation</button>
          </div>
          <div className="max-h-[590px] min-h-[360px] space-y-4 overflow-y-auto p-5" aria-live="polite">
            {history.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#001F3F]"><Sparkles className="h-6 w-6" /><p className="font-semibold">What would you like Epoch AI to help with?</p></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((prompt) => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-700 hover:border-slate-400">{prompt}</button>)}
                </div>
              </div>
            ) : history.map((item, index) => (
              <div key={index} className={`max-w-[94%] rounded-xl px-4 py-3 text-sm leading-relaxed ${item.role === "user" ? "ml-auto bg-[#001F3F] text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide opacity-70">{item.role === "user" ? "You" : "Epoch AI"}</p>
                <div className="whitespace-pre-wrap break-words">{item.content}</div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Reviewing your request...</div>}
          </div>
          <form onSubmit={(event) => void send(event)} className="border-t border-slate-200 p-4">
            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <label htmlFor="epoch-ai-message" className="mb-2 block text-xs font-semibold text-slate-700">Your request</label>
            <textarea id="epoch-ai-message" value={question} onChange={(event) => setQuestion(event.target.value)}
              maxLength={5000} rows={3} placeholder="Ask about a supplier, quotation, itinerary or attached document..."
              className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#001F3F]" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-lg text-[11px] text-slate-500">Clicking Send shares your request, selected record and attached document with the configured AI provider. Review outputs before business use.</p>
              <button type="submit" disabled={busy || question.trim().length < 2}
                className="rounded-xl bg-[#8B0000] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "Analyzing..." : "Send to Epoch AI"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
