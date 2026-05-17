"use client";

import CostSummaryCard from "@/components/quotes/create/CostSummaryCard";

type Props = {
  currency: string;
  formatMoney: (value: number, currency?: string) => string;

  calculations: {
    hotelDoubleTwinPerPerson: number;
    fixedCostPerPerson: number;
    operationalCostPerPerson: number;
    doubleTwinNetCost: number;
    freeCostPerPayingPassenger: number;
    preHotelTotal: number;
    postHotelTotal: number;
  };

  activeSellingPrice: number;
  pricingMode: "CALCULATED" | "MANUAL";
};

export default function QuoteSummarySection({
  currency,
  formatMoney,
  calculations,
  activeSellingPrice,
  pricingMode,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border">
      <div className="bg-[#8B0000] px-5 py-3 text-white">
        <h2 className="text-lg font-semibold">Pricing Summary</h2>
        <p className="mt-1 text-xs text-white/80">
          Based on active{" "}
          {pricingMode === "MANUAL" ? "manual / net" : "calculated"} selling
          prices.
        </p>
      </div>

      <div className="space-y-6 p-5">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Main Tour Pricing / Person
          </h3>

          <div className="grid gap-3 md:grid-cols-4">
            <CostSummaryCard
              label="Hotel / Person"
              value={formatMoney(
                calculations.hotelDoubleTwinPerPerson,
                currency
              )}
            />

            <CostSummaryCard
              label="Fixed Costs / Person"
              value={formatMoney(calculations.fixedCostPerPerson, currency)}
            />

            <CostSummaryCard
              label="Operational Costs / Person"
              value={formatMoney(
                calculations.operationalCostPerPerson,
                currency
              )}
            />

            <CostSummaryCard
              label="Net Cost / Person"
              value={formatMoney(calculations.doubleTwinNetCost, currency)}
              highlight
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Selling & Free Passenger Impact
          </h3>

          <div className="grid gap-3 md:grid-cols-3">
            <CostSummaryCard
              label="Selling Price / Person"
              value={formatMoney(activeSellingPrice, currency)}
              highlight
            />

            <CostSummaryCard
              label="Free Cost Impact / Paying Pax"
              value={formatMoney(
                calculations.freeCostPerPayingPassenger,
                currency
              )}
            />

            <CostSummaryCard
              label="Pricing Mode"
              value={pricingMode === "MANUAL" ? "Manual / Net" : "Calculated"}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Pre / Post Stay Totals
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <CostSummaryCard
              label="Pre-Stay Total"
              value={formatMoney(calculations.preHotelTotal, currency)}
            />

            <CostSummaryCard
              label="Post-Stay Total"
              value={formatMoney(calculations.postHotelTotal, currency)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}