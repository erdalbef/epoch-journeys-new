"use client";

type PricingControls = {
  agentCommissionPercent: number;
  epochMarkupPercent: number;
};

type Props = {
  pricing: PricingControls;
  commissionSource: string;
  onUpdatePricing: (patch: Partial<PricingControls>) => void;
  toNumber: (value: unknown) => number;
};

export default function PricingControlsSection({
  pricing,
  commissionSource,
  onUpdatePricing,
  toNumber,
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#8B0000] text-white px-5 py-3">
        <h2 className="text-lg font-semibold">Pricing Controls</h2>
      </div>

      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Agent Commission %
            </span>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={pricing.agentCommissionPercent}
              onChange={(e) =>
                onUpdatePricing({
                  agentCommissionPercent: toNumber(e.target.value),
                })
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Epoch Markup %
            </span>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={pricing.epochMarkupPercent}
              onChange={(e) =>
                onUpdatePricing({
                  epochMarkupPercent: toNumber(e.target.value),
                })
              }
            />
          </label>

          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-700">Commission Source</div>
            <div className="mt-1 text-sm">{commissionSource || "Manual / none"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}