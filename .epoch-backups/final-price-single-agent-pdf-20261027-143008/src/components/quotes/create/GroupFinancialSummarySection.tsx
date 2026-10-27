"use client";

import type { GroupFinancialSummary } from "@/lib/quotes/groupFinancialSummary";

type Props = {
  summary: GroupFinancialSummary;
  currency: string;
  pricingMode: "CALCULATED" | "MANUAL";
  formatMoney: (value: number, currency?: string) => string;
  missingCostWarnings?: string[];
};

export default function GroupFinancialSummarySection({
  summary, currency, pricingMode, formatMoney, missingCostWarnings = [],
}: Props) {
  const money = (value: number) => formatMoney(value, currency);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Group Financial Summary">
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">Group Financial Summary</h2>
        <p className="mt-1 text-xs text-blue-100">Internal only · Reference: Double/Twin occupancy · No changes to quoted prices</p>
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
        {!summary.reconciles && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">Cost categories do not reconcile to the saved NET cost. Verify expenses before approving this quotation.</p>}
        {missingCostWarnings.length > 0 && <div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Incomplete cost information</p><ul className="ml-5 mt-1 list-disc">{missingCostWarnings.map((warning,i)=><li key={`${warning}-${i}`}>{warning}</li>)}</ul></div>}
        <p className="text-xs leading-5 text-slate-500">Group totals are a read-only breakdown of the existing quotation calculation. Per-person services for paying travelers and individual COMP expenses are shown separately; fixed group costs are counted once. Costs assume Double/Twin for paying travelers, not a confirmed rooming list. Pre/post tour extensions, agency resale markup, and unrecorded costs are excluded.</p>
      </div>
    </section>
  );
}
