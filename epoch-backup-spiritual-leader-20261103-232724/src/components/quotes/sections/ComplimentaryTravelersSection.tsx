"use client";

import type { CompExpenseSettings, CompExpenseLine, CompAccommodation } from "@/lib/quotes/complimentaryCosts";
import ComplimentaryModeControls, { type ComplimentaryMode } from "./ComplimentaryModeControls";

export type ComplimentaryBasis =
  | "USES_FREE_PLACE"
  | "ADDITIONAL";

export type ComplimentarySetup = CompExpenseSettings & {
  complimentaryMode?: ComplimentaryMode;
  manualComplimentaryPassengers?: number;
  useFreePlaceRule: boolean;
  freePlaceRatio: number;

  priestComplimentary: boolean;
  priestCount: number;
  priestComplimentaryBasis: ComplimentaryBasis;

  groupLeaderComplimentary: boolean;
  groupLeaderCount: number;
  groupLeaderComplimentaryBasis: ComplimentaryBasis;

  additionalFreePassengers: number;

  groupLeaderAllowanceEnabled: boolean;
  groupLeaderAllowancePerPayingPax: number;
};

type Props = {
  setup: ComplimentarySetup;

  payingPassengers: number;

  calculatedRatioFreePlaces: number;

  totalComplimentaryPassengers: number;

  totalTravelers: number;

  groupLeaderAllowanceTotal: number;

  currency: string;
  complimentaryExpenseTotal: number;
  complimentaryExpensePerPayingPax: number;
  complimentaryExpenseLines: CompExpenseLine[];
  compCountMismatch: boolean;
  unpricedCompAccommodations: string[];

  onUpdate: (
    patch: Partial<ComplimentarySetup>
  ) => void;

  toNumber: (
    value: unknown
  ) => number;

  formatMoney: (
    amount: number,
    currency?: string
  ) => string;
};

export default function ComplimentaryTravelersSection({
  setup,
  payingPassengers,
  calculatedRatioFreePlaces,
  totalComplimentaryPassengers,
  totalTravelers,
  groupLeaderAllowanceTotal,
  currency,
  complimentaryExpenseTotal,
  complimentaryExpensePerPayingPax,
  complimentaryExpenseLines,
  compCountMismatch,
  unpricedCompAccommodations,
  onUpdate,
  toNumber,
  formatMoney,
}: Props) {
  const manualMode = setup.complimentaryMode === "MANUAL";
  const priestPoolCount =
    setup.priestComplimentary &&
    setup.priestComplimentaryBasis ===
      "USES_FREE_PLACE"
      ? setup.priestCount
      : 0;

  const leaderPoolCount =
    setup.groupLeaderComplimentary &&
    setup.groupLeaderComplimentaryBasis ===
      "USES_FREE_PLACE"
      ? setup.groupLeaderCount
      : 0;

  const namedPoolCount =
    priestPoolCount +
    leaderPoolCount;

  const availableRulePlaces =
    calculatedRatioFreePlaces;

  const poolOverflow =
    Math.max(
      namedPoolCount -
        availableRulePlaces,
      0
    );

  const freePolicyText = manualMode
    ? `Exactly ${totalComplimentaryPassengers} complimentary travelers selected manually (including named roles).`
    : setup.useFreePlaceRule
      ? `1 complimentary place for every ${setup.freePlaceRatio} full-paying pilgrims.`
      : "No automatic complimentary-place ratio is applied.";

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">
          Complimentary Travelers & Group Benefits
        </h2>

        <p className="mt-1 text-xs text-slate-200">
          Configure complimentary places, priest arrangements,
          group leader benefits and allowances.
        </p>
      </div>

      <div className="space-y-6 p-5">
        <ComplimentaryModeControls
          mode={manualMode ? "MANUAL" : "AUTOMATIC"}
          manualCount={Math.max(0, Math.floor(setup.manualComplimentaryPassengers ?? 0))}
          onChange={onUpdate}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Paying Pilgrims
            </div>

            <div className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {payingPassengers}
            </div>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Complimentary Travelers
            </div>

            <div className="mt-1 text-2xl font-semibold text-[#8B0000]">
              {totalComplimentaryPassengers}
            </div>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Travelers
            </div>

            <div className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {totalTravelers}
            </div>
          </div>
        </div>

        {!manualMode && (
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Free Place Rule
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Automatically calculate complimentary places based on the
                number of full-paying pilgrims.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={setup.useFreePlaceRule}
                onChange={(e) =>
                  onUpdate({
                    useFreePlaceRule: e.target.checked,
                  })
                }
              />

              Apply Free Place Rule
            </label>
          </div>

          {setup.useFreePlaceRule && (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Paying Pilgrims per Free Place
                </span>

                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border p-2"
                  value={setup.freePlaceRatio}
                  onChange={(e) =>
                    onUpdate({
                      freePlaceRatio: Math.max(
                        1,
                        toNumber(e.target.value)
                      ),
                    })
                  }
                />

                <span className="mt-1 block text-xs text-slate-500">
                  Standard Epoch policy: 10 paying pilgrims = 1 complimentary place.
                </span>
              </label>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-sm text-slate-500">
                  Paying Pilgrims
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {payingPassengers}
                </div>
              </div>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-sm text-slate-500">
                  Complimentary Pool
                </div>

                <div className="mt-1 text-lg font-semibold text-[#8B0000]">
                  {calculatedRatioFreePlaces}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Generated by the free-place rule.
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Priest Complimentary Place
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {manualMode
                  ? "The priest is included in your exact manual COMP count."
                  : "Specify whether the priest uses a free place from the rule or receives an additional place."}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={setup.priestComplimentary}
                onChange={(e) =>
                  onUpdate({
                    priestComplimentary: e.target.checked,
                  })
                }
              />

              Complimentary
            </label>
          </div>

          {setup.priestComplimentary && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Number of Priests
                </span>

                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border p-2"
                  value={setup.priestCount}
                  onChange={(e) =>
                    onUpdate({
                      priestCount: Math.max(
                        1,
                        toNumber(e.target.value)
                      ),
                    })
                  }
                />
              </label>

              {!manualMode && <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Complimentary Basis
                </span>

                <select
                  className="w-full rounded-md border p-2"
                  value={setup.priestComplimentaryBasis}
                  onChange={(e) =>
                    onUpdate({
                      priestComplimentaryBasis:
                        e.target.value as ComplimentaryBasis,
                    })
                  }
                >
                  <option value="USES_FREE_PLACE">
                    Uses Free Place from Rule
                  </option>

                  <option value="ADDITIONAL">
                    Additional Complimentary Place
                  </option>
                </select>

                <span className="mt-1 block text-xs text-slate-500">
                  Using the free-place pool avoids counting the priest as an
                  extra complimentary traveler.
                </span>
              </label>}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Group Leader Complimentary Place
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Specify whether the group leader uses a complimentary place
                already generated by the ratio or receives an additional
                free place.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={setup.groupLeaderComplimentary}
                onChange={(e) =>
                  onUpdate({
                    groupLeaderComplimentary: e.target.checked,
                  })
                }
              />

              Complimentary
            </label>
          </div>

          {setup.groupLeaderComplimentary && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Number of Group Leaders
                </span>

                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border p-2"
                  value={setup.groupLeaderCount}
                  onChange={(e) =>
                    onUpdate({
                      groupLeaderCount: Math.max(
                        1,
                        toNumber(e.target.value)
                      ),
                    })
                  }
                />
              </label>

              {!manualMode && <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Complimentary Basis
                </span>

                <select
                  className="w-full rounded-md border p-2"
                  value={setup.groupLeaderComplimentaryBasis}
                  onChange={(e) =>
                    onUpdate({
                      groupLeaderComplimentaryBasis:
                        e.target.value as ComplimentaryBasis,
                    })
                  }
                >
                  <option value="USES_FREE_PLACE">
                    Uses Free Place from Rule
                  </option>

                  <option value="ADDITIONAL">
                    Additional Complimentary Place
                  </option>
                </select>
              </label>}
            </div>
          )}
        </div>

        {!manualMode && (setup.priestComplimentary ||
          setup.groupLeaderComplimentary) &&
          setup.useFreePlaceRule && (
            <div
              className={`rounded-lg border p-4 ${
                poolOverflow > 0
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="font-semibold text-[#001F3F]">
                Complimentary Pool Allocation
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-slate-500">
                    Rule-Generated Places
                  </div>

                  <div className="mt-1 font-semibold">
                    {availableRulePlaces}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">
                    Named Travelers Using Pool
                  </div>

                  <div className="mt-1 font-semibold">
                    {namedPoolCount}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">
                    Pool Overflow
                  </div>

                  <div className="mt-1 font-semibold">
                    {poolOverflow}
                  </div>
                </div>
              </div>

              {poolOverflow > 0 && (
                <p className="mt-3 text-sm text-amber-900">
                  The number of named complimentary travelers using the pool
                  exceeds the places generated by the free-place rule. The
                  excess traveler(s) will therefore become additional
                  complimentary places.
                </p>
              )}
            </div>
          )}

        {!manualMode && (
        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Additional Complimentary Places
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Add any other complimentary travelers not covered by the
                automatic rule, priest or group leader arrangements.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Additional Free Travelers
              </span>

              <input
                type="number"
                min="0"
                className="w-full rounded-md border p-2"
                value={setup.additionalFreePassengers}
                onChange={(e) =>
                  onUpdate({
                    additionalFreePassengers: Math.max(
                      0,
                      toNumber(e.target.value)
                    ),
                  })
                }
              />
            </label>
          </div>
        </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-[#001F3F]">Complimentary Traveler Expenses (Internal NET Costs)</div>
          <p className="mt-1 text-sm text-amber-900">
            Accommodation and ordinary per-person services are included automatically.
            Add only EXTRA costs not already in hotel, fixed-cost or operational sections.
            Supplier credits are per traveler, only for verified free services, and cannot exceed that traveler&apos;s cost.
            Group coach costs already allocated above are NOT added again.
          </p>
          {compCountMismatch && (
            <p className="mt-3 rounded border border-red-300 bg-white p-2 text-sm text-red-700">
              Named complimentary travelers exceed the total free places. Counts are capped for costing. Adjust Manual COMPs or named travelers.
            </p>
          )}
          {unpricedCompAccommodations.length > 0 && (
            <p className="mt-3 rounded border border-red-300 bg-white p-2 text-sm text-red-700">
              Missing hotel prices for: {unpricedCompAccommodations.join(", ").replaceAll("_", " ")}.
              Verify the chosen accommodation basis for every complimentary traveler before issuing a quote.
            </p>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {([
              { key: "priestCostProfile", label: "Priest / Spiritual Director" },
              { key: "leaderCostProfile", label: "Group Leader" },
              { key: "otherCostProfile", label: "Other Complimentary Travelers" },
            ] as const).map(({key, label}) => {
              const profile = setup[key];
              const editProfile = (patch: Partial<NonNullable<typeof profile>>) =>
                onUpdate({ [key]: { accommodation: "DOUBLE_TWIN", extrasPerTraveler: 0, supplierCreditPerTraveler: 0, ...profile, ...patch } });
              return (
                <div key={key} className="rounded-lg border bg-white p-3">
                  <div className="mb-3 text-sm font-semibold text-[#001F3F]">{label}</div>
                  <label className="mb-3 block text-xs">
                    Accommodation basis
                    <select className="mt-1 w-full rounded border p-2 text-sm"
                      value={profile?.accommodation ?? "DOUBLE_TWIN"}
                      onChange={e => editProfile({ accommodation: e.target.value as CompAccommodation })}>
                      <option value="DOUBLE_TWIN">Double/Twin per person</option>
                      <option value="SINGLE">Single room per person</option>
                      <option value="TRIPLE">Triple per person</option>
                      <option value="NONE">No hotel charge (confirmed free)</option>
                    </select>
                  </label>
                  <label className="mb-3 block text-xs">Extra cost per COMP (not elsewhere)
                    <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2 text-sm"
                      value={profile?.extrasPerTraveler ?? 0}
                      onChange={e => editProfile({ extrasPerTraveler: Math.max(0,toNumber(e.target.value)) })}/>
                  </label>
                  <label className="block text-xs">Supplier benefit / credit per COMP
                    <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2 text-sm"
                      value={profile?.supplierCreditPerTraveler ?? 0}
                      onChange={e => editProfile({ supplierCreditPerTraveler: Math.max(0,toNumber(e.target.value)) })}/>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {complimentaryExpenseLines.filter(line => line.travelers > 0).map(line => (
              <div key={line.category} className="flex justify-between gap-3">
                <span>{line.category.replaceAll("_", " ")} × {line.travelers} ({line.accommodation.replaceAll("_", "/")})</span>
                <strong>{formatMoney(line.netTotal, currency)}</strong>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total COMPs paid by Epoch</span><span>{formatMoney(complimentaryExpenseTotal, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[#8B0000]">
              <span>Recovered per paying pilgrim ({payingPassengers} payers)</span>
              <span>{formatMoney(complimentaryExpensePerPayingPax, currency)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Group Leader Allowance / Commission
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Optional amount paid to the group leader for every paying pilgrim.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={setup.groupLeaderAllowanceEnabled}
                onChange={(e) =>
                  onUpdate({
                    groupLeaderAllowanceEnabled: e.target.checked,
                  })
                }
              />

              Add Allowance
            </label>
          </div>

          {setup.groupLeaderAllowanceEnabled && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Amount per Paying Pilgrim
                </span>

                <div className="flex">
                  <div className="flex items-center rounded-l-md border border-r-0 bg-slate-50 px-3 text-sm text-slate-500">
                    {currency}
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-r-md border p-2"
                    value={setup.groupLeaderAllowancePerPayingPax}
                    onChange={(e) =>
                      onUpdate({
                        groupLeaderAllowancePerPayingPax: Math.max(
                          0,
                          toNumber(e.target.value)
                        ),
                      })
                    }
                  />
                </div>
              </label>

              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-sm text-slate-500">
                  Total Group Leader Allowance
                </div>

                <div className="mt-1 text-lg font-semibold text-[#001F3F]">
                  {formatMoney(
                    groupLeaderAllowanceTotal,
                    currency
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {payingPassengers} paying pilgrims ×{" "}
                  {formatMoney(
                    setup.groupLeaderAllowancePerPayingPax,
                    currency
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Agency Proposal Preview
          </div>

          <h3 className="mt-1 font-semibold text-[#001F3F]">
            Complimentary Place Policy
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {freePolicyText}
          </p>

          {setup.priestComplimentary && (
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Priest:{" "}
              <strong>
                {setup.priestCount}
              </strong>{" "}
              complimentary{" "}
              {setup.priestCount === 1
                ? "place"
                : "places"}
              ,{" "}
              {manualMode
                ? "included within the exact manual total."
                : setup.priestComplimentaryBasis === "USES_FREE_PLACE"
                  ? "using the complimentary allocation generated by the free-place rule."
                  : "provided in addition to the standard free-place allocation."}
            </p>
          )}

          {setup.groupLeaderComplimentary && (
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Group Leader:{" "}
              <strong>
                {setup.groupLeaderCount}
              </strong>{" "}
              complimentary{" "}
              {setup.groupLeaderCount === 1
                ? "place"
                : "places"}
              ,{" "}
              {manualMode
                ? "included within the exact manual total."
                : setup.groupLeaderComplimentaryBasis === "USES_FREE_PLACE"
                  ? "using the complimentary allocation generated by the free-place rule."
                  : "provided in addition to the standard free-place allocation."}
            </p>
          )}

          <div className="mt-4 border-t border-emerald-200 pt-3 text-sm">
            Current quotation:{" "}
            <strong>
              {payingPassengers} paying pilgrims +{" "}
              {totalComplimentaryPassengers} complimentary ={" "}
              {totalTravelers} travelers
            </strong>
          </div>
        </div>

      </div>
    </section>
  );
}
