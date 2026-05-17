"use client";

type PricingMode = "CALCULATED" | "MANUAL";

type PaxPricingRow = {
  paxCount: number;

  calculatedSinglePrice: number;
  calculatedDoubleTwinPrice: number;
  calculatedTriplePrice: number;

  manualSinglePrice: number;
  manualDoubleTwinPrice: number;
  manualTriplePrice: number;
};

type Props = {
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;

  paxPricingRows: PaxPricingRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<PaxPricingRow>) => void;

  toNumber: (value: unknown) => number;
  formatMoney?: (value: number, currency?: string) => string;
  currency?: string;
};

function getDisplayValue(
  row: PaxPricingRow,
  pricingMode: PricingMode,
  field: "single" | "double" | "triple"
) {
  if (field === "single") {
    return pricingMode === "MANUAL"
      ? row.manualSinglePrice
      : row.calculatedSinglePrice;
  }

  if (field === "double") {
    return pricingMode === "MANUAL"
      ? row.manualDoubleTwinPrice
      : row.calculatedDoubleTwinPrice;
  }

  return pricingMode === "MANUAL"
    ? row.manualTriplePrice
    : row.calculatedTriplePrice;
}

export default function PassengerPricingSection({
  pricingMode,
  onPricingModeChange,
  paxPricingRows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  toNumber,
  formatMoney,
  currency = "EUR",
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#8B0000] text-white px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Passenger Pricing</h2>
          <p className="text-xs text-white/80 mt-1">
            Use calculated selling prices or manually enter net / override rates.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          className="bg-white text-[#8B0000] px-3 py-1.5 rounded-md text-sm font-medium"
        >
          Add Row
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onPricingModeChange("CALCULATED")}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              pricingMode === "CALCULATED"
                ? "bg-[#8B0000] text-white border-[#8B0000]"
                : "bg-white text-slate-700"
            }`}
          >
            Calculated Pricing
          </button>

          <button
            type="button"
            onClick={() => onPricingModeChange("MANUAL")}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              pricingMode === "MANUAL"
                ? "bg-[#8B0000] text-white border-[#8B0000]"
                : "bg-white text-slate-700"
            }`}
          >
            Manual / Net Rates
          </button>
        </div>

        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
          {pricingMode === "CALCULATED"
            ? "Calculated mode uses the system-generated selling prices from your cost engine."
            : "Manual mode lets you enter override / net selling prices while still showing calculated prices as reference."}
        </div>

        <div className="space-y-4">
          {paxPricingRows.map((row, index) => {
            const displaySingle = getDisplayValue(row, pricingMode, "single");
            const displayDouble = getDisplayValue(row, pricingMode, "double");
            const displayTriple = getDisplayValue(row, pricingMode, "triple");

            return (
              <div key={index} className="rounded-lg border p-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] items-end">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Pax</span>
                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.paxCount}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          paxCount: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>

                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
                    <div className="font-medium text-slate-700">
                      Active Prices
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-slate-500">Single</div>
                        <div className="font-semibold">
                          {formatMoney
                            ? formatMoney(displaySingle, currency)
                            : displaySingle}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Double / Twin</div>
                        <div className="font-semibold">
                          {formatMoney
                            ? formatMoney(displayDouble, currency)
                            : displayDouble}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Triple</div>
                        <div className="font-semibold">
                          {formatMoney
                            ? formatMoney(displayTriple, currency)
                            : displayTriple}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    disabled={paxPricingRows.length === 1}
                    className="rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">
                      Calculated Prices
                    </h3>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Single
                        </span>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-slate-50 p-2"
                          value={row.calculatedSinglePrice}
                          readOnly
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Double / Twin
                        </span>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-slate-50 p-2"
                          value={row.calculatedDoubleTwinPrice}
                          readOnly
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Triple
                        </span>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-slate-50 p-2"
                          value={row.calculatedTriplePrice}
                          readOnly
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">
                      Manual Override / Net Rates
                    </h3>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Single
                        </span>
                        <input
                          type="number"
                          className={`w-full rounded-md border p-2 ${
                            pricingMode === "MANUAL"
                              ? "bg-white"
                              : "bg-slate-50"
                          }`}
                          value={row.manualSinglePrice}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              manualSinglePrice: toNumber(e.target.value),
                            })
                          }
                          disabled={pricingMode !== "MANUAL"}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Double / Twin
                        </span>
                        <input
                          type="number"
                          className={`w-full rounded-md border p-2 ${
                            pricingMode === "MANUAL"
                              ? "bg-white"
                              : "bg-slate-50"
                          }`}
                          value={row.manualDoubleTwinPrice}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              manualDoubleTwinPrice: toNumber(e.target.value),
                            })
                          }
                          disabled={pricingMode !== "MANUAL"}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Triple
                        </span>
                        <input
                          type="number"
                          className={`w-full rounded-md border p-2 ${
                            pricingMode === "MANUAL"
                              ? "bg-white"
                              : "bg-slate-50"
                          }`}
                          value={row.manualTriplePrice}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              manualTriplePrice: toNumber(e.target.value),
                            })
                          }
                          disabled={pricingMode !== "MANUAL"}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {pricingMode === "MANUAL" && (
                  <div className="rounded-md border bg-amber-50 p-3 text-sm text-slate-700">
                    Calculated prices remain visible for reference, but the manual
                    values are the active selling prices for this pax row.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}