"use client";

import { useMemo, useState } from "react";
import type { ItineraryDay } from "@/lib/epoch-ai/itineraryReview";
import { proposeFullItineraryRoutes, summarizeOperationalFindings } from "@/lib/epoch-ai/fullItineraryRoutePlan";

type DayResult = {
  day: number;
  legs: Array<{ from: string; to: string; distanceKm: number; drivingMinutes: number }>;
  distanceKm: number | null;
  drivingMinutes: number | null;
  estimatedBreaks: number | null;
  critical: boolean;
  warnings: string[];
  status: "critical-review" | "incomplete-review";
};
type RouteResponse = { days?: DayResult[]; error?: string };

function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** A simple interface on top of the existing read-only HERE service.
 * It never claims to have discovered unlisted shrines, local transfers, or safer coach routes.
 */
export default function HereFullItineraryReview({ days }: { days: ItineraryDay[] }) {
  const proposed = useMemo(() => proposeFullItineraryRoutes(days), [days]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [showRoutes, setShowRoutes] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [reports, setReports] = useState<DayResult[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [complete, setComplete] = useState(false);

  const routes = proposed.map(d => ({
    ...d,
    stops: (edits[d.day] ?? d.stops.join("\n")).split(/\r?\n/).map(s => s.trim()).filter(Boolean),
  }));
  const toCheck = routes.filter(d => d.dayType !== "flight_only" && d.stops.length >= 2);
  const missing = routes.filter(d => d.dayType !== "flight_only" && d.stops.length < 2);
  const invalid = routes.some(d => d.stops.length > 5 || d.stops.some(s => s.length < 2 || s.length > 120) ||
    d.stops.some((s, i) => i > 0 && s.toLocaleLowerCase() === d.stops[i - 1].toLocaleLowerCase()));
  const tested = reports.length;
  const distance = reports.reduce((total, d) => total + (d.distanceKm ?? 0), 0);
  const driving = reports.reduce((total, d) => total + (d.drivingMinutes ?? 0), 0);
  const critical = reports.filter(r => r.critical).length;
  const findings = summarizeOperationalFindings(reports.flatMap(r => r.warnings));
  const overnightMoves = routes.filter(d => d.source === "overnight-transition").length;
  const showReport = reports.length > 0;

  function update(day: number, value: string) {
    setEdits(prev => ({ ...prev, [day]: value }));
    setReports([]);
    setComplete(false);
    setProgress("");
    setError("");
  }

  async function verify() {
    setError(""); setProgress(""); setReports([]); setComplete(false);
    if (invalid) { setShowRoutes(true); setError("Correct the highlighted route entries before checking."); return; }
    if (!toCheck.length) {
      setShowRoutes(true);
      setError("No road legs are established. Add at least two stops to a driving day.");
      return;
    }
    setWorking(true);
    const finished: DayResult[] = [];
    try {
      // The existing endpoint caps each authenticated request at 3 days.
      for (let i = 0; i < toCheck.length; i += 3) {
        const batch = toCheck.slice(i, i + 3);
        setProgress(`Checking ${Math.min(i + batch.length, toCheck.length)} of ${toCheck.length} route days...`);
        const response = await fetch("/api/admin/epoch-ai/full-route-check", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "same-origin", cache: "no-store",
          body: JSON.stringify({ days: batch.map(d => ({ day: d.day, stops: d.stops })) }),
        });
        const result: RouteResponse = await response.json();
        if (!response.ok || !result.days || result.days.length !== batch.length) {
          throw new Error(result.error || "Route review could not be completed.");
        }
        finished.push(...result.days);
        setReports([...finished]);
      }
      setComplete(true);
      setProgress("");
    } catch (cause) {
      setError((cause instanceof Error ? cause.message : "Routing unavailable.") +
        " The displayed results are partial; the full review did not finish.");
      setShowRoutes(true);
    } finally { setWorking(false); }
  }

  return <section aria-label="Itinerary route review" className="space-y-3 rounded-xl border border-slate-300 bg-white p-4">
    <div>
      <h3 className="text-base font-bold text-[#001F3F]">Itinerary Review</h3>
      <p className="mt-1 text-sm text-slate-600">Check the proposed road journeys for the whole pilgrimage. Only important exceptions appear below.</p>
    </div>
    <button type="button" onClick={verify} disabled={working}
      className="w-full rounded-lg bg-[#001F3F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
      {working ? "Checking itinerary routes..." : "Verify Itinerary & Find Improvements"}
    </button>
    {progress && <p role="status" className="text-sm text-slate-600">{progress}</p>}
    {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
    <p className="text-xs text-slate-600">Routes are initially proposed from overnight-city changes. Intermediate shrines, same-city excursions, airport transfers, and road conditions are not automatically established yet.</p>
    <button type="button" onClick={() => setShowRoutes(s => !s)} disabled={working}
      aria-expanded={showRoutes} className="text-sm font-medium text-[#001F3F] underline">
      {showRoutes ? "Hide proposed stops" : `Review / correct proposed stops (${toCheck.length} routes, ${missing.length} incomplete days)`}
    </button>
    {showRoutes && <div className="max-h-[26rem] space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-600">Optional corrections: one location per line, in actual driving order (2–5 places per day). A blank day is not proof of no driving.</p>
      {routes.map(d => <label key={d.day} className="block rounded-md border border-slate-200 p-2 text-xs font-medium text-slate-700">
        Day {d.day} — {d.title} {d.dayType === "flight_only" ? "(flight-only)" : ""}
        <textarea value={edits[d.day] ?? d.stops.join("\n")} rows={2} maxLength={604}
          disabled={working || d.dayType === "flight_only"}
          onChange={e => update(d.day, e.target.value)}
          placeholder={d.dayType === "flight_only" ? "No road legs assumed" : "Enter actual road stops only if known"}
          className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm font-normal disabled:bg-slate-100" />
        {d.dayType !== "flight_only" && d.stops.length < 2 &&
          <span className="mt-1 block text-amber-800">Road journey not established; local or airport transfers may be missing.</span>}
      </label>)}
      {invalid && <p role="alert" className="text-sm text-red-700">Use 2–5 stops per checked day, each 2–120 characters, without adjacent duplicates.</p>}
    </div>}
    {showReport && <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <h4 className="text-sm font-semibold text-slate-900">Review summary {complete ? "" : "(partial)"}</h4>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div><strong className="block text-lg">{tested}/{days.length}</strong><span className="text-xs text-slate-500">Days with routes checked</span></div>
        <div><strong className="block text-lg">{distance.toFixed(1)} km</strong><span className="text-xs text-slate-500">Checked roads only</span></div>
        <div><strong className="block text-lg">{formatMinutes(driving)}</strong><span className="text-xs text-slate-500">HERE car driving</span></div>
        <div><strong className="block text-lg">{critical + missing.length}</strong><span className="text-xs text-slate-500">Critical / missing-route items</span></div>
      </div>
      {critical > 0 && <p role="alert" className="text-sm font-semibold text-red-800">{critical} checked day(s) have a reported critical routing restriction. Resolve before scheduling.</p>}
      {missing.length > 0 && <p className="text-sm text-amber-800">{missing.length} day(s) have no complete road route proposed. Check local excursions, arrival/departure transfers and other omitted drives.</p>}
      <div className="divide-y divide-slate-200">{reports.map(r => <details key={r.day} className="py-2 text-sm">
        <summary className="cursor-pointer font-medium">Day {r.day} · {r.distanceKm?.toFixed(1) ?? "?"} km · {r.drivingMinutes === null ? "time unknown" : formatMinutes(r.drivingMinutes)} · {r.critical ? "Critical restriction" : "Coach review needed"}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">{r.legs.map((leg, i) => <li key={i}>{leg.from} → {leg.to}: {leg.distanceKm.toFixed(1)} km, {leg.drivingMinutes} min</li>)}</ul>
        <p className="mt-1 text-xs text-slate-600">Estimated roadside breaks: {r.estimatedBreaks ?? "Unknown"}. Suitable intermediate visit breaks are not confirmed.</p>
      </details>)}</div>
      <div className="space-y-1 text-sm"><strong>What to improve</strong>
        {overnightMoves > 2 && <p>Consider whether some hotel changes can be combined into comfortable two-night bases without adding unnecessary road time.</p>}
        <p>Confirm mandatory shrine stops, local excursions, Mass appointments and 90-minute lunches before calling any day feasible.</p>
        <p>Have the coach operator verify full-size coach restrictions, access, parking and road suitability. HERE car estimates do not establish the safest road.</p>
        <p className="text-xs text-slate-600">Alternative route sequences and road-condition comparisons have not yet been calculated. No route optimization has been validated.</p>
      </div>
      <button type="button" onClick={() => setShowWarnings(v => !v)} aria-expanded={showWarnings}
        className="text-sm text-[#001F3F] underline">{showWarnings ? "Hide detailed findings" : `View technical findings (${findings.length} categories)`}</button>
      {showWarnings && <div className="space-y-2 text-xs text-slate-700">{findings.map(g => <div key={g.category}>
        <strong>{g.category}</strong><span> — {g.count} distinct findings</span>
        <ul className="list-disc pl-5">{g.examples.map(s => <li key={s}>{s}</li>)}</ul>
      </div>)}</div>}
    </div>}
    <p className="text-xs text-amber-800">Advisory only. Driving figures cover listed road legs, not guaranteed full-trip totals. Mass, visits, breaks, coach access and actual road conditions require verification. Nothing is saved or approved.</p>
  </section>;
}
