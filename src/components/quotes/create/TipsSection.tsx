"use client";

import CostBreakdownCard from "@/components/quotes/create/CostBreakdownCard";

type TipRow = {
  tipType: string;
  amountPerDayPerPerson: number;
  totalDays: number;
  assignedPax: number;
};

type Props = {
  tipRows: TipRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<TipRow>) => void;

  total: number;
  currency: string;

  toNumber: (value: unknown) => number;
  formatMoney: (value: number, currency: string) => string;
  tipRowTotal: (row: TipRow) => number;
};

export default function TipsSection({
  tipRows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  total,
  currency,
  toNumber,
  formatMoney,
  tipRowTotal,
}: Props) {
  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-purple-700">Tips</h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter tips by person, day, and assigned passenger count.
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Formula: Cost Per Day Per Person × Days × Assigned Pax
          </p>

          <p className="mt-1 text-xs text-slate-500">
            If tips are paid for free travelers too, assigned pax should include
            free travelers.
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Tips Section Total
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
          + Add Tip
        </button>
      </div>

      <div className="space-y-4">
        {tipRows.map((row, index) => {
          const rowTotal = tipRowTotal(row);

          return (
            <div key={index} className="rounded-xl border bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Tip Type
                    </span>

                    <input
                      className="w-full rounded-md border p-2"
                      placeholder="Guide / Driver / Tour Manager"
                      value={row.tipType}
                      onChange={(e) =>
                        onUpdateRow(index, { tipType: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Cost / Day / Person
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.amountPerDayPerPerson}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          amountPerDayPerPerson: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Days
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.totalDays}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          totalDays: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Assigned Pax
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.assignedPax}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          assignedPax: toNumber(e.target.value),
                        })
                      }
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Usually total passengers
                    </p>
                  </label>
                </div>

                <div className="lg:col-span-3">
                  <CostBreakdownCard
                    title="Tip Calculation"
                    lines={[
                      {
                        label: "Cost / Day / Person",
                        value: formatMoney(
                          toNumber(row.amountPerDayPerPerson),
                          currency
                        ),
                      },
                      {
                        label: "Days",
                        value: toNumber(row.totalDays),
                      },
                      {
                        label: "Assigned Pax",
                        value: toNumber(row.assignedPax),
                      },
                    ]}
                    total={formatMoney(rowTotal, currency)}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveRow(index)}
                  disabled={tipRows.length === 1}
                  className="rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}