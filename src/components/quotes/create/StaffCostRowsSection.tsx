"use client";

import CostBreakdownCard from "@/components/quotes/create/CostBreakdownCard";

export type StaffCostRow = {
  label: string;
  dailyRate: number;
  days: number;
  hotelSinglePerNight: number;
  nights: number;
  mealsPerDay: number;
  mealDays: number;
  extras: number;
};

type Props = {
  title: string;

  rows: StaffCostRow[];

  total: number;
  currency: string;

  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (
    index: number,
    patch: Partial<StaffCostRow>
  ) => void;

  rowTotal: (row: StaffCostRow) => number;

  toNumber: (value: unknown) => number;
  formatMoney: (value: number, currency: string) => string;
};

export default function StaffCostRowsSection({
  title,
  rows,
  total,
  currency,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  rowTotal,
  toNumber,
  formatMoney,
}: Props) {
  return (
    <div className="rounded-lg border p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>

          <p className="mt-1 text-sm text-slate-500">
            Staff operational costs including salary/service,
            accommodation, meals, and extras.
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Formula:
            Daily Rate × Days
            + Hotel
            + Meals
            + Extras
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Section Total
          </div>

          <div className="text-lg font-semibold text-slate-800">
            {formatMoney(total, currency)}
          </div>
        </div>
      </div>

      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          + Add Row
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const totalForRow = rowTotal(row);

          return (
            <div
              key={index}
              className="rounded-xl border bg-white p-4"
            >
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Label
                    </span>

                    <input
                      className="w-full rounded-md border p-2"
                      value={row.label}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          label: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Daily Rate
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.dailyRate}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          dailyRate: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-1">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Days
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.days}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          days: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Hotel / Night
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.hotelSinglePerNight}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          hotelSinglePerNight: toNumber(
                            e.target.value
                          ),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-1">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Nights
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.nights}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          nights: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-3">
                  <CostBreakdownCard
                    title="Cost Breakdown"
                    lines={[
                      {
                        label: "Daily Service",
                        value: formatMoney(
                          toNumber(row.dailyRate) *
                            toNumber(row.days),
                          currency
                        ),
                      },
                      {
                        label: "Hotel",
                        value: formatMoney(
                          toNumber(
                            row.hotelSinglePerNight
                          ) * toNumber(row.nights),
                          currency
                        ),
                      },
                      {
                        label: "Meals",
                        value: formatMoney(
                          toNumber(row.mealsPerDay) *
                            toNumber(row.mealDays),
                          currency
                        ),
                      },
                      {
                        label: "Extras",
                        value: formatMoney(
                          toNumber(row.extras),
                          currency
                        ),
                      },
                    ]}
                    totalLabel="Row Total"
                    total={formatMoney(totalForRow, currency)}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Meals / Day
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.mealsPerDay}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          mealsPerDay: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Meal Days
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.mealDays}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          mealDays: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Extras
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.extras}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          extras: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-5 flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    disabled={rows.length === 1}
                    className="rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}