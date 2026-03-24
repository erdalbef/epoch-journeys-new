"use client";

import { useState } from "react";

type PricingTierPresetHelperProps = {
  onApply: (minPax: number, maxPax: number) => void;
};

export default function PricingTierPresetHelper({
  onApply,
}: PricingTierPresetHelperProps) {
  const [minPax, setMinPax] = useState<number>(1);
  const [maxPax, setMaxPax] = useState<number>(2);

  function handleApply() {
    if (!Number.isFinite(minPax) || !Number.isFinite(maxPax)) {
      return;
    }

    if (minPax < 1 || maxPax < minPax) {
      return;
    }

    onApply(minPax, maxPax);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-900">
          Tier Preset Builder
        </h4>
        <p className="text-sm text-slate-600">
          Enter one pax range and create Single, Double / Twin, and Triple rows
          together.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Min Pax</label>
          <input
            type="number"
            min={1}
            value={minPax}
            onChange={(e) => setMinPax(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Max Pax</label>
          <input
            type="number"
            min={1}
            value={maxPax}
            onChange={(e) => setMaxPax(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create 3 Room-Type Rows
          </button>
        </div>
      </div>
    </div>
  );
}