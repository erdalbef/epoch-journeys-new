"use client";

import { useState } from "react";
import RouteFeasibilityPanel from "./RouteFeasibilityPanel";
import HereMultiLegCheck from "./HereMultiLegCheck";
import HereFullItineraryReview from "./HereFullItineraryReview";
import type { ItineraryDay } from "@/lib/epoch-ai/itineraryReview";
import type { buildRouteFeasibilitySummary } from "@/lib/epoch-ai/routeFeasibilitySummary";

type Report = ReturnType<typeof buildRouteFeasibilitySummary>;
type Result = { report?: Report; error?: string; checkedLeg?: { from: string; to: string; day: number } };

/** Explicit, read-only check: never infers a full daily route from AI prose. */
export default function HereRouteLegCheck({ days, draftDays }: { days: number[]; draftDays: ItineraryDay[] }) {
  const [day, setDay] = useState(days[0] ?? 1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [checkedLeg, setCheckedLeg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const invalidate = () => { setReport(null); setCheckedLeg(""); setError(""); };

  async function checkRoute() {
    invalidate();
    if (!from.trim() || !to.trim()) { setError("Enter both places to check the road leg."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/epoch-ai/route-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ day, from: from.trim(), to: to.trim() }),
      });
      const result: Result = await response.json();
      if (!response.ok || !result.report || !result.checkedLeg) {
        throw new Error(result.error || "Route check unavailable.");
      }
      setReport(result.report);
      setCheckedLeg(`Day ${result.checkedLeg.day}: ${result.checkedLeg.from} to ${result.checkedLeg.to}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Route check unavailable.");
    } finally { setLoading(false); }
  }

  return <div className="space-y-4"><section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-semibold text-slate-900">HERE Road Leg Check (advisory)</h3>
    <p className="text-xs text-slate-600">Enter one exact origin and destination from the draft. HERE car estimates do not validate coach access or the full day. Do not enter personal addresses.</p>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-xs font-medium">Day
        <select value={day} onChange={e => { setDay(Number(e.target.value)); invalidate(); }} className="mt-1 block w-full rounded border p-2">
          {days.map(d => <option key={d} value={d}>Day {d}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium">Origin (city / shrine)
        <input value={from} maxLength={120} onChange={e => { setFrom(e.target.value); invalidate(); }} className="mt-1 block w-full rounded border p-2" placeholder="Lisbon, Portugal" />
      </label>
      <label className="text-xs font-medium">Destination (city / shrine)
        <input value={to} maxLength={120} onChange={e => { setTo(e.target.value); invalidate(); }} className="mt-1 block w-full rounded border p-2" placeholder="Fatima, Portugal" />
      </label>
    </div>
    <button type="button" disabled={loading || !from.trim() || !to.trim()} onClick={checkRoute}
      className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {loading ? "Checking HERE..." : "Check road leg with HERE"}
    </button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {checkedLeg && <p className="text-xs font-medium text-slate-700">Checked: {checkedLeg}</p>}
    <RouteFeasibilityPanel report={report} />
  </section><HereMultiLegCheck days={days} /><HereFullItineraryReview days={draftDays} /></div>;
}
