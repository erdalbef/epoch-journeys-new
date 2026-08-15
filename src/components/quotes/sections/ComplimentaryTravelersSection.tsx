"use client";

export type ComplimentarySetup = {
  useFreePlaceRule: boolean;
  freePlaceRatio: number;

  priestComplimentary: boolean;
  priestCount: number;

  groupLeaderComplimentary: boolean;
  groupLeaderCount: number;

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

  onUpdate: (patch: Partial<ComplimentarySetup>) => void;

  toNumber: (value: unknown) => number;

  formatMoney: (amount: number, currency?: string) => string;
};

export default function ComplimentaryTravelersSection({
  setup,
  payingPassengers,
  calculatedRatioFreePlaces,
  totalComplimentaryPassengers,
  totalTravelers,
  groupLeaderAllowanceTotal,
  currency,
  onUpdate,
  toNumber,
  formatMoney,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      {/* HEADER */}
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">
          Complimentary Travelers & Group Benefits
        </h2>

        <p className="mt-1 text-xs text-slate-200">
          Configure complimentary places, priest arrangements,
          group leader benefits, and allowances.
        </p>
      </div>

      <div className="space-y-6 p-5">
        {/* SUMMARY */}
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

        {/* FREE PLACE RULE */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Free Place Rule
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Automatically calculate complimentary places based
                on the number of paying pilgrims.
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
                  Default: 10 paying pilgrims = 1 free place.
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
                  Calculated Free Places
                </div>

                <div className="mt-1 text-lg font-semibold text-[#8B0000]">
                  {calculatedRatioFreePlaces}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PRIEST */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Priest Complimentary Place
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Include the priest as a complimentary traveler.
                The priest&apos;s tour costs will ultimately be
                distributed among paying pilgrims.
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
            <div className="mt-4 max-w-xs">
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
            </div>
          )}
        </div>

        {/* GROUP LEADER */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Group Leader Complimentary Place
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Use this when the group leader travels free of
                charge with the group.
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
            <div className="mt-4 max-w-xs">
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
            </div>
          )}
        </div>

        {/* ADDITIONAL FREE */}
        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Additional Complimentary Places
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Add any complimentary travelers not covered by the
                automatic rule, priest, or group leader settings.
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

        {/* GROUP LEADER ALLOWANCE */}
        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Group Leader Allowance / Commission
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Optional amount paid to the group leader for every
                paying pilgrim.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={setup.groupLeaderAllowanceEnabled}
                onChange={(e) =>
                  onUpdate({
                    groupLeaderAllowanceEnabled:
                      e.target.checked,
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
                    value={
                      setup.groupLeaderAllowancePerPayingPax
                    }
                    onChange={(e) =>
                      onUpdate({
                        groupLeaderAllowancePerPayingPax:
                          Math.max(
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

        {/* FINAL SUMMARY */}
        <div className="rounded-xl border-2 border-[#001F3F] bg-slate-50 p-5">
          <div className="mb-4 font-semibold text-[#001F3F]">
            Group Costing Summary
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-slate-500">
                Paying Pilgrims
              </div>

              <div className="mt-1 text-lg font-semibold">
                {payingPassengers}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Complimentary
              </div>

              <div className="mt-1 text-lg font-semibold">
                {totalComplimentaryPassengers}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Total Travelers
              </div>

              <div className="mt-1 text-lg font-semibold">
                {totalTravelers}
              </div>
            </div>

            <div>
              <div className="text-slate-500">
                Leader Allowance
              </div>

              <div className="mt-1 text-lg font-semibold">
                {formatMoney(
                  groupLeaderAllowanceTotal,
                  currency
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}