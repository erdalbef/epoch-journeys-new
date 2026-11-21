"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

type Day = {
  day: number;
  title: string;
  description: string;
  overnight: string;
  massPlan: string;
  logistics: string;
};
type Draft = {
  journeyOverview: string;
  days: Day[];
  reviewNotes: string[];
};

type Props = {
  currentItinerary: string;
  currentOverview: string;
  isPublished: boolean;
  onApply: (itinerary: string, overview: string) => void;
};

function asText(form: FormData, field: string): string {
  return String(form.get(field) ?? "").trim();
}

function formatDay(day: Day): string {
  return [
    `Day ${day.day} — ${day.title}`,
    day.description,
    `Mass: ${day.massPlan}`,
    `Overnight: ${day.overnight}`,
  ].filter(Boolean).join("\n");
}

/** Draft-only AI assistance inside the existing master Tour editor.
 * Nothing is saved, published, priced or booked by this component.
 */
export default function EpochItineraryAssistant({ currentItinerary, currentOverview, isPublished, onApply }: Props) {
  const [brief, setBrief] = useState("");
  const [revise, setRevise] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  async function generate(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest("form");
    if (!form) { setError("Tour form not found."); return; }
    const data = new FormData(form);
    const duration = Number(asText(data, "duration"));
    if (!Number.isInteger(duration) || duration < 2 || duration > 30) {
      setError("Enter a duration between 2 and 30 days in Tour Identity first."); return;
    }
    if (brief.trim().length < 12) {
      setError("Enter an itinerary brief of at least 12 characters."); return;
    }
    setWorking(true); setError(""); setDraft(null);
    try {
      const response = await fetch("/api/admin/epoch-ai/itinerary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({
          title: asText(data, "title"), duration,
          arrivalCity: asText(data, "arrivalCity"),
          departureCity: asText(data, "departureCity"),
          destinations: asText(data, "destinations"),
          instructions: brief.trim(),
          existingItinerary: revise ? currentItinerary : "",
        }),
      });
      const result: { error?: string; draft?: Draft } = await response.json();
      if (!response.ok || !result.draft) throw new Error(result.error || "AI did not return an itinerary.");
      setDraft(result.draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate itinerary.");
    } finally { setWorking(false); }
  }

  function applyDraft() {
    if (!draft) return;
    if ((currentItinerary.trim() || currentOverview.trim()) && !window.confirm("Replace the current itinerary and journey overview with this draft? Changes are not saved until you save the Tour form.")) return;
    if (isPublished && !window.confirm("This master tour is already PUBLISHED. If you later save this form, your changes may immediately appear to agents. Continue inserting the draft?")) return;
    onApply(draft.days.map(formatDay).join("\n\n"), draft.journeyOverview);
    setError("");
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#001F3F]/20 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[#001F3F]">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-base font-bold">Epoch AI — Itinerary Designer</h3>
      </div>
      {isPublished && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">This tour is published. Saving a revised master itinerary may update the Agent Dashboard immediately. Review carefully or work in a separate unpublished tour first.</p>}
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Draft a tour based on The Epoch Standard: daily Mass for Catholic groups, two-night hotel stays where practical,
        coach breaks about every two hours, at least 90 minutes for lunch, accessible hotels, coach drop-off and porterage checks.
        This assistant does not verify live driving times, Mass availability or supplier bookings.
      </p>
      <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="epoch-itinerary-brief">Your itinerary instructions</label>
      <textarea id="epoch-itinerary-brief" value={brief} onChange={(event) => setBrief(event.target.value)}
        rows={4} maxLength={3500}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#001F3F]"
        placeholder="For example: 12-day Fatima, Lourdes, Assisi and Rome Catholic pilgrimage for elderly pilgrims. Prefer 2-night stays; avoid very long driving days. Include Eucharistic Miracle sites." />
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={revise} onChange={(event) => setRevise(event.target.checked)} />
        Revise the existing itinerary rather than create a new draft
      </label>
      <button type="button" onClick={generate} disabled={working}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {working ? "Preparing draft..." : "Generate itinerary draft"}
      </button>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {draft && (
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#001F3F]">
            <CheckCircle2 className="h-4 w-4" /> Draft ready — review before inserting
          </div>
          <p className="text-sm leading-6 text-slate-700">{draft.journeyOverview}</p>
          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {draft.days.map((day) => (
              <article key={day.day} className="rounded-lg border border-slate-200 p-3">
                <h4 className="font-bold text-[#001F3F]">Day {day.day} — {day.title}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{day.description}</p>
                <p className="mt-2 text-xs text-slate-600"><strong>Mass plan:</strong> {day.massPlan}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Overnight:</strong> {day.overnight}</p>
                <p className="mt-1 text-xs text-slate-600"><strong>Logistics / verify:</strong> {day.logistics}</p>
              </article>
            ))}
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4"/> Operational checks before confirmation</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
              {draft.reviewNotes.map((note, index) => <li key={index}>{note}</li>)}
              <li>Independently verify travel times, Mass arrangements, hotel coach access and porterage; AI suggestions are not confirmations.</li>
            </ul>
          </div>
          <button type="button" onClick={applyDraft}
            className="rounded-lg border border-[#001F3F] px-4 py-2 text-sm font-semibold text-[#001F3F] hover:bg-slate-50">
            Insert draft into Tour Editor
          </button>
          <p className="text-xs text-slate-500">This replaces the itinerary and journey overview fields only after your confirmation. Operational verification notes remain in this preview and do not appear in the agent itinerary. Save separately. No automatic pricing.</p>
        </div>
      )}
    </div>
  );
}
