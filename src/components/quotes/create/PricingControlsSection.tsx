"use client";

export type MarkupMode = "PERCENTAGE" | "FIXED_PER_PERSON";

export type PricingControls = {
  markupMode: MarkupMode;
  epochMarkupPercent: number;
  epochMarkupPerPerson: number;
};

type Props = {
  pricing: PricingControls;
  onUpdatePricing: (patch: Partial<PricingControls>) => void;
  toNumber: (value: unknown) => number;
};

export default function PricingControlsSection({
  pricing,
  onUpdatePricing,
  toNumber,
}: Props) {
  const isPercentage = pricing.markupMode === "PERCENTAGE";
  const isFixed = pricing.markupMode === "FIXED_PER_PERSON";

  return (
    <section className="overflow-hidden rounded-xl border">
      {/* HEADER */}
      <div className="bg-[#8B0000] px-5 py-3 text-white">
        <h2 className="text-lg font-semibold">Epoch NET Pricing</h2>

        <p className="mt-1 text-xs text-white/80">
          Internal pricing control. Choose either a percentage markup or a
          fixed markup amount per paying pilgrim.
        </p>
      </div>

      <div className="space-y-5 p-5">
        {/* MARKUP METHOD */}
        <div>
          <div className="mb-2 text-sm font-medium">
            Markup Method
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {/* PERCENTAGE */}
            <button
              type="button"
              onClick={() =>
                onUpdatePricing({
                  markupMode: "PERCENTAGE",
                })
              }
              className={`rounded-lg border p-4 text-left transition ${
                isPercentage
                  ? "border-[#8B0000] bg-red-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-[#001F3F]">
                Percentage Markup
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Add a percentage to the calculated cost per paying pilgrim.
              </div>
            </button>

            {/* FIXED */}
            <button
              type="button"
              onClick={() =>
                onUpdatePricing({
                  markupMode: "FIXED_PER_PERSON",
                })
              }
              className={`rounded-lg border p-4 text-left transition ${
                isFixed
                  ? "border-[#8B0000] bg-red-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-[#001F3F]">
                Fixed Amount per Paying Pilgrim
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Add any amount you choose to the calculated cost per paying
                pilgrim.
              </div>
            </button>
          </div>
        </div>

        {/* MARKUP INPUT */}
        <div className="grid gap-4 md:grid-cols-2">
          {isPercentage && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Epoch Markup %
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border p-2"
                value={pricing.epochMarkupPercent}
                onChange={(e) =>
                  onUpdatePricing({
                    epochMarkupPercent: toNumber(e.target.value),
                  })
                }
                placeholder="e.g. 15"
              />

              <span className="mt-1 block text-xs text-slate-500">
                Example: enter 15 for a 15% markup.
              </span>
            </label>
          )}

          {isFixed && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Markup Amount per Paying Pilgrim
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border p-2"
                value={pricing.epochMarkupPerPerson}
                onChange={(e) =>
                  onUpdatePricing({
                    epochMarkupPerPerson: toNumber(e.target.value),
                  })
                }
                placeholder="e.g. 275"
              />

              <span className="mt-1 block text-xs text-slate-500">
                Enter any amount you wish. There are no preset markup amounts.
              </span>
            </label>
          )}

          {/* POLICY */}
          <div className="rounded-md border bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-700">
              B2B NET Policy
            </div>

            <div className="mt-1">
              Epoch provides the travel agency with a NET rate. The agency
              determines its own client selling price and resale margin.
            </div>
          </div>
        </div>

        {/* FORMULA */}
        <div className="rounded-lg border border-dashed bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pricing Formula
          </div>

          {isPercentage ? (
            <div className="mt-1 text-sm font-medium text-[#001F3F]">
              NET per person = Cost per Paying Pilgrim + Percentage Markup
            </div>
          ) : (
            <div className="mt-1 text-sm font-medium text-[#001F3F]">
              NET per person = Cost per Paying Pilgrim + Fixed Markup per
              Paying Pilgrim
            </div>
          )}
        </div>
      </div>
    </section>
  );
}