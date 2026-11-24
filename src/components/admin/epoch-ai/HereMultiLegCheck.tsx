"use client";

import { useState } from "react";
import RouteFeasibilityPanel from "./RouteFeasibilityPanel";
import type { buildRouteFeasibilitySummary } from "@/lib/epoch-ai/routeFeasibilitySummary";

type Report = ReturnType<typeof buildRouteFeasibilitySummary>;
type Leg = { from: string; to: string; distanceKm: number; drivingMinutes: number; coachAccess: "unverified" | "restriction-reported" };
type Result = { report?: Report; legs?: Leg[]; error?: string };

/** Checks EVERY supplied adjacent road leg. Does not infer missing visits from AI prose. */
export default function HereMultiLegCheck({ days }: { days: number[] }) {
  const [day, setDay] = useState(days[0] ?? 1);
  const [stops, setStops] = useState("");
  const [visit, setVisit] = useState("");
  const [mass, setMass] = useState("");
  const [lunch, setLunch] = useState("");
  const [buffer, setBuffer] = useState("");
  const [fixedAppointments, setFixedAppointments] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const invalidate = () => { setReport(null); setLegs([]); setError(""); };
  const parsedStops = stops.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  function minutesOrNull(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
  }
  const allowances = [visit, mass, lunch, buffer];
  const invalidAllowance = allowances.some(v => v.trim() !== "" && (!/^\d+$/.test(v.trim()) || Number(v) > 1440));

  async function review() {
    invalidate();
    if (parsedStops.length < 2 || parsedStops.length > 7 || invalidAllowance) {
      setError("Enter 2-7 stops and valid whole-minute allowances (or leave them unknown)."); return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/epoch-ai/multi-route-check", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ day, stops: parsedStops,
          visitMinutes: minutesOrNull(visit), massMinutes: minutesOrNull(mass),
          lunchMinutes: minutesOrNull(lunch), operationalBufferMinutes: minutesOrNull(buffer),
          fixedAppointments }),
      });
      const data: Result = await response.json();
      if (!response.ok || !data.report || !data.legs) throw new Error(data.error ?? "Route check failed.");
      setReport(data.report); setLegs(data.legs);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Route check failed."); }
    finally { setLoading(false); }
  }

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-semibold text-slate-900">HERE Multi-Leg Day Review (advisory)</h3>
    <p className="text-xs text-slate-600">Enter every driving stop in travel order, one place per line. This verifies the listed legs automatically, not unlisted transfers. No route is coach-approved, saved or published. Do not enter personal addresses.</p>
    <label className="block text-xs font-medium">Itinerary day
      <select className="mt-1 block w-full rounded border p-2" value={day} onChange={e => { setDay(Number(e.target.value)); invalidate(); }}>
        {days.map(d => <option value={d} key={d}>Day {d}</option>)}
      </select>
    </label>
    <label className="block text-xs font-medium">Stops in order (2-7)
      <textarea className="mt-1 block w-full rounded border p-2" rows={4} maxLength={840}
        placeholder={"Lisbon, Portugal\nSantarém, Portugal\nFátima, Portugal"}
        value={stops} onChange={e => { setStops(e.target.value); invalidate(); }}/>
    </label>
    <p className="text-xs text-slate-600">Optional daily minutes. Blank means unknown; do not put zero unless the activity is genuinely absent.</p>
    <div className="grid gap-2 sm:grid-cols-4">
      {([ ["Visits", visit, setVisit], ["Mass", mass, setMass], ["Lunch", lunch, setLunch], ["Boarding / walking buffer", buffer, setBuffer] ] as const).map(([label, value, setter]) =>
        <label key={label} className="text-xs font-medium">{label}
          <input type="number" min={0} max={1440} step={1} placeholder="Unknown" value={value}
            onChange={e => { setter(e.target.value); invalidate(); }} className="mt-1 block w-full rounded border p-2" />
        </label>)}
    </div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fixedAppointments}
      onChange={e => { setFixedAppointments(e.target.checked); invalidate(); }}/>
      Fixed Mass / guide / reservation appointments need schedule review</label>
    <button type="button" disabled={loading || parsedStops.length < 2 || parsedStops.length > 7 || invalidAllowance}
      onClick={review} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {loading ? "Checking all road legs..." : "Verify listed road legs with HERE"}
    </button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {legs.length > 0 && <div className="space-y-1 text-sm">
      <p className="font-semibold">Calculated road legs ({legs.length})</p>
      <ol className="list-decimal pl-5">{legs.map((leg, i) => <li key={i}>{leg.from} → {leg.to}: {leg.distanceKm.toFixed(1)} km, {leg.drivingMinutes} min (coach access unverified)</li>)}</ol>
      <p className="text-xs text-amber-800">Listed legs only. The total is not a verified whole-day itinerary unless all transfers and time allowances are confirmed.</p>
    </div>}
    {report && <RouteFeasibilityPanel report={report} />}
  </section>;
}
