"use client";

import type { GroupFinancialSummary } from "@/lib/quotes/groupFinancialSummary";

type Props = {
  summary: GroupFinancialSummary;
  currency: string;
  pricingMode: "CALCULATED" | "MANUAL";
  calculatedSinglePrice: number;
  calculatedDoubleTwinPrice: number;
  finalSinglePrice: number;
  finalDoubleTwinPrice: number;
  manualSinglePrice: number;
  manualDoubleTwinPrice: number;
  onSetManualSingle: (value: number) => void;
  onSetManualDoubleTwin: (value: number) => void;
  onSetSingleSupplement: (value: number | null) => void;
  onUseCalculated: () => void;
  formatMoney: (value: number, currency?: string) => string;
  missingCostWarnings?: string[];
};

export default function GroupFinancialSummarySection({
  summary, currency, pricingMode, formatMoney, missingCostWarnings = [],
  calculatedSinglePrice, calculatedDoubleTwinPrice,
  finalSinglePrice, finalDoubleTwinPrice,
  manualSinglePrice, manualDoubleTwinPrice,
  onSetManualSingle, onSetManualDoubleTwin, onSetSingleSupplement, onUseCalculated,
}: Props) {
  const money = (value: number) => formatMoney(value, currency);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Group Financial Summary">
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">Group Financial Summary</h2>
        <p className="mt-1 text-xs text-blue-100">Internal cost breakdown · Selling-price decisions are saved separately from supplier costs</p>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-3"><p className="text-xs text-slate-500">Paying passengers</p><p className="text-xl font-semibold">{summary.payingPassengers}</p></div>
          <div className="rounded-lg border bg-slate-50 p-3"><p className="text-xs text-slate-500">Complimentary passengers</p><p className="text-xl font-semibold">{summary.freePassengers}</p></div>
          <div className="rounded-lg border bg-slate-50 p-3"><p className="text-xs text-slate-500">Total travelers</p><p className="text-xl font-semibold">{summary.totalTravelers}</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b bg-slate-50 text-slate-600"><th className="px-3 py-2 text-left">Expense category</th><th className="px-3 py-2 text-right">Share / payer</th><th className="px-3 py-2 text-right">Group amount</th></tr></thead>
            <tbody>
              {summary.lines.map((line) => <tr key={line.key} className="border-b"><td className="px-3 py-2">{line.label}</td><td className="px-3 py-2 text-right tabular-nums">{money(line.perPayingPax)}</td><td className="px-3 py-2 text-right tabular-nums">{money(line.groupTotal)}</td></tr>)}
              {Math.abs(summary.reconciliationDifference) >= 0.005 && (
                <tr className="border-b bg-amber-50"><td className="px-3 py-2">{summary.reconciles ? "Per-payer rounding reconciliation" : "Cost reconciliation difference - review"}</td><td className="px-3 py-2 text-right">-</td><td className="px-3 py-2 text-right tabular-nums">{money(summary.reconciliationDifference)}</td></tr>
              )}
              <tr className="border-b font-semibold text-[#001F3F]"><td className="px-3 py-3">TOTAL GROUP COST</td><td className="px-3 py-3 text-right tabular-nums">{money(summary.costPerPayingPax)}</td><td className="px-3 py-3 text-right tabular-nums">{money(summary.totalGroupCost)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4"><p className="text-xs text-slate-500">NET selling price / paying pax</p><p className="text-lg font-semibold text-[#001F3F]">{money(summary.sellingPerPayingPax)}</p><p className="text-xs text-slate-500">{pricingMode === "MANUAL" ? "Manual NET rate" : "Calculated NET rate"}</p></div>
          <div className="rounded-lg border p-4"><p className="text-xs text-slate-500">Expected group revenue</p><p className="text-lg font-semibold text-[#001F3F]">{money(summary.expectedRevenue)}</p></div>
          <div className="rounded-lg border p-4"><p className="text-xs text-slate-500">Projected group profit / loss</p><p className={`text-lg font-semibold ${summary.projectedProfit < 0 ? "text-red-700" : "text-emerald-800"}`}>{money(summary.projectedProfit)}</p><p className="text-xs text-slate-500">Margin on revenue: {summary.marginPercent.toFixed(2)}%</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Final agency selling prices">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#001F3F]">Final Agency NET Selling Prices</h3>
              <p className="mt-1 text-xs text-slate-600">Prices per paying traveler for this exact group size ({summary.payingPassengers}). Edits create or update this group's pricing tier; they do not change supplier costs.</p>
            </div>
            <button type="button" onClick={onUseCalculated} className="rounded-md border bg-white px-3 py-2 text-xs font-medium text-[#001F3F]">Use automated prices</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs text-slate-500">Automated Double/Twin</p>
              <p className="text-lg font-semibold tabular-nums">{money(calculatedDoubleTwinPrice)}</p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <p className="text-xs text-slate-500">Automated Single</p>
              <p className="text-lg font-semibold tabular-nums">{calculatedSinglePrice > 0 ? money(calculatedSinglePrice) : "Rate missing"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-[#001F3F]">
              Final Double/Twin NET
              <input type="number" min="0" step="0.01" inputMode="decimal"
                className="mt-1 w-full rounded-md border bg-white p-2"
                value={pricingMode === "MANUAL" && manualDoubleTwinPrice > 0 ? manualDoubleTwinPrice : ""}
                placeholder={`Auto: ${calculatedDoubleTwinPrice.toFixed(2)}`}
                onChange={(event) => onSetManualDoubleTwin(Math.max(0, Number(event.target.value) || 0))}
                disabled={summary.payingPassengers < 1}
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">Current: {money(finalDoubleTwinPrice)}</span>
            </label>
            <label className="block text-sm font-medium text-[#001F3F]">
              Final Single NET
              <input type="number" min="0" step="0.01" inputMode="decimal"
                className="mt-1 w-full rounded-md border bg-white p-2"
                value={pricingMode === "MANUAL" && manualSinglePrice > 0 ? manualSinglePrice : ""}
                placeholder={calculatedSinglePrice > 0 ? `Auto: ${calculatedSinglePrice.toFixed(2)}` : "Single rate required"}
                onChange={(event) => onSetManualSingle(Math.max(0, Number(event.target.value) || 0))}
                disabled={summary.payingPassengers < 1 || calculatedSinglePrice <= 0}
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">Current: {finalSinglePrice > 0 ? money(finalSinglePrice) : "Not available"}</span>
            </label>
            <label className="block text-sm font-medium text-[#001F3F]">
              Single Supplement
              <input type="number" min="0" step="0.01" inputMode="decimal"
                className="mt-1 w-full rounded-md border bg-white p-2"
                value={pricingMode === "MANUAL" && manualSinglePrice > 0 ? Math.max(0, Math.round((finalSinglePrice - finalDoubleTwinPrice) * 100) / 100) : ""}
                placeholder={calculatedSinglePrice > 0 ? `Auto: ${Math.max(0, calculatedSinglePrice - calculatedDoubleTwinPrice).toFixed(2)}` : "N/A"}
                onChange={(event) => onSetSingleSupplement(event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0))}
                disabled={summary.payingPassengers < 1 || calculatedSinglePrice <= 0 || finalDoubleTwinPrice <= 0}
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">Current difference: {finalSinglePrice > 0 && finalDoubleTwinPrice > 0 ? money(Math.max(0, finalSinglePrice - finalDoubleTwinPrice)) : "N/A"}</span>
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">Single Supplement = final Single price minus final Double/Twin price. Entering a supplement updates the final Single price, rather than adding a separate cost. The final Double/Twin rate remains the forecast/invoice basis until the actual rooming list is known. Save Draft to retain changes.</p>
        </div>
        {!summary.reconciles && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">Cost categories do not reconcile to the saved NET cost. Verify expenses before approving this quotation.</p>}
        {missingCostWarnings.length > 0 && <div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Incomplete cost information</p><ul className="ml-5 mt-1 list-disc">{missingCostWarnings.map((warning,i)=><li key={`${warning}-${i}`}>{warning}</li>)}</ul></div>}
        <p className="text-xs leading-5 text-slate-500">Group totals are a read-only breakdown of the existing quotation calculation. Per-person services for paying travelers and individual COMP expenses are shown separately; fixed group costs are counted once. Costs assume Double/Twin for paying travelers, not a confirmed rooming list. Pre/post tour extensions, agency resale markup, and unrecorded costs are excluded.</p>
      </div>
    </section>
  );
}
