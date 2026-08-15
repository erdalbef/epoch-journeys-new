type PricingMode = "CALCULATED" | "MANUAL";

type Props = {
  currency: string;
  pricingMode: PricingMode;
  activeSellingPrice: number;
  calculations: {
    hotelDoubleTwinPerPerson: number;
    fixedCostPerPerson: number;
    operationalCostPerPerson: number;
    doubleTwinNetCost: number;
    freeCostPerPayingPassenger: number;
  };
  formatMoney: (amount: number, currency?: string) => string;
};

export default function QuoteSummarySection({
  currency,
  pricingMode,
  activeSellingPrice,
  calculations,
  formatMoney,
}: Props) {
  const profitPerPerson =
    activeSellingPrice - calculations.doubleTwinNetCost;

  const marginPercent =
    activeSellingPrice > 0
      ? (profitPerPerson / activeSellingPrice) * 100
      : 0;

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">
          Internal Cost & NET Rate Summary
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Reference occupancy: Double / Twin per person. Pre/post stays are optional add-ons and are not included in the main tour price.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="mb-2 font-medium">
              Net Cost / Person — Double / Twin
            </div>

            <div className="flex justify-between">
              <span>Hotel / Person</span>
              <span>
                {formatMoney(
                  calculations.hotelDoubleTwinPerPerson,
                  currency
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Fixed Costs / Person</span>
              <span>
                {formatMoney(calculations.fixedCostPerPerson, currency)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Operational Costs / Person</span>
              <span>
                {formatMoney(
                  calculations.operationalCostPerPerson,
                  currency
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Free Cost Impact / Paying Pax</span>
              <span>
                {formatMoney(
                  calculations.freeCostPerPayingPassenger,
                  currency
                )}
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span>Net Cost / Person</span>
              <span>
                {formatMoney(calculations.doubleTwinNetCost, currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="mb-2 font-medium">
              Active NET Rate to Agency
            </div>

            <div className="flex justify-between">
              <span>Pricing Mode</span>
              <span>
                {pricingMode === "MANUAL"
                  ? "Manual NET"
                  : "Calculated"}
              </span>
            </div>

            <div className="flex justify-between">
              <span>NET Rate / Paying Pax</span>
              <span>
                {formatMoney(activeSellingPrice, currency)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Net Cost / Person</span>
              <span>
                {formatMoney(calculations.doubleTwinNetCost, currency)}
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span>Profit / Person</span>
              <span>
                {formatMoney(profitPerPerson, currency)}
              </span>
            </div>

            <div className="flex justify-between font-semibold">
              <span>Margin</span>
              <span>{marginPercent.toFixed(2)}%</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The agency NET rate is calculated on a Double / Twin per-paying-passenger basis.
            Single and triple NET rates should be shown separately in group
            pricing. Pre/post stay prices should be optional per-person add-ons,
            not group totals.
          </div>
        </div>
      </div>
    </section>
  );
}