"use client";

import { useState } from "react";
import type { ApprovedTier } from "@/lib/quotes/flexibleGroupPricing";
import type { SuggestedTier } from "@/lib/quotes/flexiblePricingSuggestions";

type Tier = ApprovedTier & { verified: boolean; imported: boolean };
const blank = (): Tier => ({
  payingPilgrims: 0, complimentaryPilgrims: 0, single: 0, doubleTwin: 0,
  triple: null, roomArrangements: "", note: "", verified: false, imported: false,
});
const toTier = (tier: ApprovedTier, imported: boolean): Tier => ({
  payingPilgrims: tier.payingPilgrims, complimentaryPilgrims: tier.complimentaryPilgrims,
  single: tier.single, doubleTwin: tier.doubleTwin, triple: tier.triple,
  roomArrangements: tier.roomArrangements || "", note: tier.note || "",
  verified: false, imported,
});
const fieldStyle = "mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:border-indigo-700 focus:outline-none";

export default function FlexiblePricingEditor({ id, initial, enabled, suggestions, currency }: {
  id: string; initial: ApprovedTier[]; enabled: boolean; suggestions: SuggestedTier[]; currency: string;
}) {
  const [tiers, setTiers] = useState<Tier[]>(initial.length ? initial.map(t => toTier(t, false)) : []);
  const [active, setActive] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function change(index: number, key: keyof ApprovedTier, raw: string) {
    setTiers(previous => previous.map((current, j) => {
      if (j !== index) return current;
      const value = key === "note" || key === "roomArrangements" ? raw
        : key === "triple" && raw === "" ? null : Number(raw);
      const next: Tier = { ...current, [key]: value, verified: false } as Tier;
      // The group-size and COMPs determine the cost basis. Never retain rates
      // calculated for another basis if either changes.
      if (key === "payingPilgrims" || key === "complimentaryPilgrims") {
        next.single = 0; next.doubleTwin = 0; next.triple = null;
        next.roomArrangements = ""; next.imported = false;
      }
      if (key === "roomArrangements" && raw !== current.roomArrangements) {
        // A room allocation change may affect the complimentary expense.
        next.single = 0; next.doubleTwin = 0; next.triple = null;
        next.imported = false;
      }
      return next;
    }));
    setMessage("");
  }

  function loadSuggestions() {
    setTiers(previous => {
      const meaningful = previous.filter(row => row.payingPilgrims > 0);
      const seen = new Set(meaningful.map(row => row.payingPilgrims));
      const additions = suggestions.filter(row => !seen.has(row.payingPilgrims))
        .slice(0, Math.max(0, 12 - meaningful.length)).map(row => toTier(row, true));
      return [...meaningful, ...additions];
    });
    setError(false);
    setMessage("Available saved pricing rows loaded as drafts. Verify costs, complimentary pilgrims, and room arrangements for every tier before publishing.");
  }

  async function save(publish: boolean) {
    if (publish && (!tiers.length || tiers.some(row => !row.verified))) {
      setError(true);
      setMessage("Confirm the costing, complimentary allocation and room arrangements for every alternative before publishing.");
      return;
    }
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(id)}/flexible-pricing`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: publish, tiers: tiers.map(({ imported: _imported, ...rest }) => rest) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Save failed");
      setActive(publish);
      setTiers(old => old.map(row => ({ ...row, verified: false })));
      setMessage(publish ? "Approved and published. Generate the Agent PDF again to display approved alternative NET rates and, when a website address is configured, the secure online link." : "Alternative pricing unpublished. Agents can no longer access it.");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Save failed");
    } finally { setBusy(false); }
  }

  const verifiedAll = tiers.length > 0 && tiers.every(row => row.verified);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Alternative pilgrim group sizes</h2>
        <p className="text-sm text-slate-600">NET per paying pilgrim · {currency} · maximum 12 alternatives</p>
      </div>
      <button type="button" onClick={loadSuggestions} disabled={!suggestions.length || busy}
        className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
        Load Calculated Alternatives ({suggestions.length})
      </button>
    </div>
    {!suggestions.length && <p className="rounded-lg border p-3 text-sm text-amber-900">
      No saved calculated alternative rows are available. Add group-size rows in the quotation's <strong>Group NET Rates</strong> section, save the quotation, then return here.
    </p>}
    {!!suggestions.length && <p className="text-xs text-slate-600">Loading adds missing saved group sizes without overwriting your existing alternatives. These prices are drafts, not approvals. A different complimentary allocation or room arrangement must be independently re-costed.</p>}

    {tiers.map((tier, index) => <section key={index} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><h3 className="font-semibold">Alternative {index + 1}</h3>
          {tier.imported && <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">From saved calculation</span>}</div>
        <button type="button" onClick={() => { setTiers(old => old.filter((_, j) => j !== index)); setMessage(""); }} className="text-sm font-medium text-red-700">Remove</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {([ ["payingPilgrims", "Paying pilgrims"], ["complimentaryPilgrims", "Complimentary pilgrims"], ["doubleTwin", "NET Double/Twin"], ["single", "NET Single"], ["triple", "NET Triple (optional)"] ] as const).map(([key, label]) =>
          <label key={key} className="block text-sm font-medium text-slate-800">{label}
            <input type="number" min="0" step={key.includes("Pilgrims") ? "1" : "0.01"} className={fieldStyle}
              value={tier[key] ?? ""} onChange={event => change(index, key, event.target.value)} />
          </label>)}
        <div className="rounded-lg border bg-slate-50 p-3 text-sm"><div className="text-slate-500">Total pilgrims</div>
          <div className="mt-1 text-xl font-semibold">{tier.payingPilgrims + tier.complimentaryPilgrims}</div></div>
      </div>
      <label className="mt-4 block text-sm font-medium">Complimentary room arrangements (verify for this tier)
        <input className={fieldStyle} value={tier.roomArrangements || ""}
          placeholder="e.g. Spiritual Leader: 1 × Single; Group Leader: 1 × Double/Twin"
          onChange={event => change(index, "roomArrangements", event.target.value)} />
      </label>
      <label className="mt-4 block text-sm font-medium">Conditions / notes
        <input className={fieldStyle} value={tier.note} onChange={event => change(index, "note", event.target.value)} />
      </label>
      <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <input className="mt-1" type="checkbox" checked={tier.verified} onChange={event => setTiers(old => old.map((item, j) => j === index ? { ...item, verified: event.target.checked } : item))} />
        <span>I have checked the NET rates against the costs for <strong>{tier.payingPilgrims} paying + {tier.complimentaryPilgrims} complimentary pilgrims</strong>, including the Spiritual Leader, Group Leader and room arrangements where applicable.</span>
      </label>
    </section>)}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium" disabled={busy || tiers.length >= 12} onClick={() => setTiers(old => [...old, blank()])}>Add Manual Alternative</button>
      <button type="button" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={busy || !verifiedAll} onClick={() => save(true)}>Approve and Publish</button>
      <button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40" disabled={busy || !active} onClick={() => save(false)}>Unpublish</button>
    </div>
    <p role="status" className={error ? "text-sm text-red-800" : "text-sm text-slate-700"}>{message || (active ? "Currently published. Changing draft values does not publish them until reapproved." : "Not published")}</p>
  </div>;
}
