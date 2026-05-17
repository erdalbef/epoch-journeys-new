"use client";

import CostSummaryCard from "@/components/quotes/create/CostSummaryCard";

type Props = {
  currency: string;
  pricingMode: "CALCULATED" | "MANUAL";
  costPerPerson: number;
  sellingPerPerson: number;
  profitPerPerson: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  marginPercent: number;
  formatMoney: (value: number, currency?: string) => string;
};

export default function ProfitViewSection({
  currency,
  pricingMode,
  costPerPerson,
  sellingPerPerson,
  profitPerPerson,
  totalCost,
  totalRevenue,
  totalProfit,
  marginPercent,
  formatMoney,
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#14532d] text-white px-5 py-3">
        <h2 className="text-lg font-semibold">Profit View</h2>
        <p className="text-xs text-white/80 mt-1">
          Based on active {pricingMode === "MANUAL" ? "manual" : "calculated"} selling prices.
        </p>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Per Person
          </h3>

          <div className="grid gap-3 md:grid-cols-4">
            <CostSummaryCard
              label="Cost / Person"
              value={formatMoney(costPerPerson, currency)}
            />
            <CostSummaryCard
              label="Selling / Person"
              value={formatMoney(sellingPerPerson, currency)}
            />
            <CostSummaryCard
              label="Profit / Person"
              value={formatMoney(profitPerPerson, currency)}
              highlight
            />
            <CostSummaryCard
              label="Margin %"
              value={`${marginPercent.toFixed(2)}%`}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Group Totals
          </h3>

          <div className="grid gap-3 md:grid-cols-3">
            <CostSummaryCard
              label="Total Cost"
              value={formatMoney(totalCost, currency)}
            />
            <CostSummaryCard
              label="Total Revenue"
              value={formatMoney(totalRevenue, currency)}
            />
            <CostSummaryCard
              label="Total Profit"
              value={formatMoney(totalProfit, currency)}
              highlight
            />
          </div>
        </div>
      </div>
    </section>
  );
}