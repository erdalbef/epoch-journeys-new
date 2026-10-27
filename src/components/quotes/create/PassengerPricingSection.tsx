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
  tripleAvailable?: boolean;
  seasonalReference?: {
    single: number;
    doubleTwin: number;
    triple: number;
    season: string;
    minPax: number | null;
  } | null;
};

function getDisplayValue(
  row: PaxPricingRow,
  pricingMode: PricingMode,
  field: "single" | "double" | "triple"
) {
  if (field === "single") {
    return pricingMode === "MANUAL" && row.manualSinglePrice > 0
      ? row.manualSinglePrice
      : row.calculatedSinglePrice;
  }

  if (field === "double") {
    return pricingMode === "MANUAL" && row.manualDoubleTwinPrice > 0
      ? row.manualDoubleTwinPrice
      : row.calculatedDoubleTwinPrice;
  }

  return pricingMode === "MANUAL" && row.manualTriplePrice > 0
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
  seasonalReference = null,
  tripleAvailable = true,
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#8B0000] text-white px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Group NET Rates</h2>
          <p className="text-xs text-white/80 mt-1">
            NET rates to the travel agency by paying passenger count. The agency controls its own resale markup.
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
            Calculated NET Rates
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
            Final Selling Price (Manual)
          </button>
        </div>

        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-600">
          {pricingMode === "CALCULATED"
            ? "Calculated mode uses verified tour cost plus Epoch markup. Seasonal pricing remains a separate reference."
            : "Enter the agreed NET price below the automated calculation for each paying-pax tier. These saved final prices are used for the Agency PDF and, after approval, booking/invoice preparation. Supplier costs remain unchanged."}
        </div>

        {seasonalReference && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Seasonal reference</div>
                <div className="mt-1 font-semibold text-[#001F3F]">{seasonalReference.season}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Internal guidance only{seasonalReference.minPax ? ` · based on minimum ${seasonalReference.minPax} paying pax` : ""}.
                  It is not the final contractual NET rate.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right text-sm">
                <div><div className="text-xs text-slate-500">Single</div><div className="font-semibold">{formatMoney ? formatMoney(seasonalReference.single, currency) : seasonalReference.single}</div></div>
                <div><div className="text-xs text-slate-500">Double/Twin</div><div className="font-semibold">{formatMoney ? formatMoney(seasonalReference.doubleTwin, currency) : seasonalReference.doubleTwin}</div></div>
                <div><div className="text-xs text-slate-500">Triple</div><div className="font-semibold">{tripleAvailable ? (formatMoney ? formatMoney(seasonalReference.triple, currency) : seasonalReference.triple) : "Not available"}</div></div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {paxPricingRows.map((row, index) => {
            const displaySingle = getDisplayValue(row, pricingMode, "single");
            const displayDouble = getDisplayValue(row, pricingMode, "double");
            const displayTriple = getDisplayValue(row, pricingMode, "triple");
            const recommendedSingle = Math.max(row.calculatedSinglePrice, seasonalReference?.single ?? 0);
            const recommendedDouble = Math.max(row.calculatedDoubleTwinPrice, seasonalReference?.doubleTwin ?? 0);
            const recommendedTriple = tripleAvailable ? Math.max(row.calculatedTriplePrice, seasonalReference?.triple ?? 0) : 0;
            const applyFinalRates = (single: number, doubleTwin: number, triple: number) => {
              onUpdateRow(index, {
                manualSinglePrice: Math.round(single),
                manualDoubleTwinPrice: Math.round(doubleTwin),
                manualTriplePrice: tripleAvailable ? Math.round(triple) : 0,
              });
              onPricingModeChange("MANUAL");
            };

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
                      Final Agency NET Rates
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
                          {tripleAvailable
                            ? (formatMoney
                                ? formatMoney(displayTriple, currency)
                                : displayTriple)
                            : "Not available"}
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

                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-amber-900">Final NET decision</div>
                      <div className="mt-1 text-xs text-amber-800">
                        Recommended uses the higher of the verified calculated NET and seasonal reference, protecting Epoch from quoting below either benchmark. Admin can still edit the final NET manually.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onPricingModeChange("CALCULATED")} className="rounded-md border bg-white px-3 py-2 text-xs font-medium">Use Calculated</button>
                      {seasonalReference && <button type="button" onClick={() => applyFinalRates(seasonalReference.single, seasonalReference.doubleTwin, seasonalReference.triple)} className="rounded-md border bg-white px-3 py-2 text-xs font-medium">Use Seasonal</button>}
                      <button type="button" onClick={() => applyFinalRates(recommendedSingle, recommendedDouble, recommendedTriple)} className="rounded-md bg-[#8B0000] px-3 py-2 text-xs font-medium text-white">Use Recommended</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                    <div><span className="text-slate-500">Single recommended:</span> <strong>{formatMoney ? formatMoney(recommendedSingle, currency) : recommendedSingle}</strong></div>
                    <div><span className="text-slate-500">Double/Twin recommended:</span> <strong>{formatMoney ? formatMoney(recommendedDouble, currency) : recommendedDouble}</strong></div>
                    <div><span className="text-slate-500">Triple recommended:</span> <strong>{tripleAvailable ? (formatMoney ? formatMoney(recommendedTriple, currency) : recommendedTriple) : "Not available"}</strong></div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-md border p-4">
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">
                      Calculated NET Rates
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
                          value={tripleAvailable ? row.calculatedTriplePrice : ""}
                           placeholder={tripleAvailable ? undefined : "Not available"}
                          readOnly
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">
                      Final Selling Price — Optional Manual Override
                    </h3>

                    <p className="mb-3 text-xs text-slate-600">
                      Enter a positive agreed NET rate per paying traveler, or leave a field blank to use its automated rate. Editing activates manual selling prices. The selected final rates are saved with the quotation.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Single
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.manualSinglePrice > 0 ? row.manualSinglePrice : ""}
                          placeholder={`Auto: ${row.calculatedSinglePrice}`}
                          onChange={(e) => {
                            onPricingModeChange("MANUAL");
                            onUpdateRow(index, {
                              manualSinglePrice: Math.max(0, toNumber(e.target.value)),
                            });
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Double / Twin
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.manualDoubleTwinPrice > 0 ? row.manualDoubleTwinPrice : ""}
                          placeholder={`Auto: ${row.calculatedDoubleTwinPrice}`}
                          onChange={(e) => {
                            onPricingModeChange("MANUAL");
                            onUpdateRow(index, {
                              manualDoubleTwinPrice: Math.max(0, toNumber(e.target.value)),
                            });
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Triple
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={tripleAvailable && row.manualTriplePrice > 0 ? row.manualTriplePrice : ""}
                          placeholder={tripleAvailable ? `Auto: ${row.calculatedTriplePrice}` : "N/A"}
                          onChange={(e) => {
                            onPricingModeChange("MANUAL");
                            onUpdateRow(index, {
                              manualTriplePrice: Math.max(0, toNumber(e.target.value)),
                            });
                          }}
                          disabled={!tripleAvailable}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {pricingMode === "MANUAL" && (
                  <div className="rounded-md border bg-amber-50 p-3 text-sm text-slate-700">
                    Positive manual entries override the automated prices. Empty fields retain the automated price. Use Calculated to return to fully automatic pricing.
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