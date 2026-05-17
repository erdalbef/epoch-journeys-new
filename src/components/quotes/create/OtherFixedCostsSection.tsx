"use client";

import CostBreakdownCard from "@/components/quotes/create/CostBreakdownCard";

type OtherFixedRow = {
  label: string;
  amountPerUnit: number;
  quantity: number;
};

type Props = {
  rows: OtherFixedRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<OtherFixedRow>) => void;
  total: number;
  currency: string;
  toNumber: (value: unknown) => number;
  formatMoney: (value: number, currency: string) => string;
  rowTotal: (row: OtherFixedRow) => number;
};

export default function OtherFixedCostsSection({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  total,
  currency,
  toNumber,
  formatMoney,
  rowTotal,
}: Props) {
  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-emerald-700">
            Other Fixed Costs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Use this for per-person costs such as lunches, dinners, whisper
            sets, city taxes, or similar items.
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Formula: Cost Per Person × Quantity / Days / Units
          </p>

          <p className="mt-1 text-xs text-slate-500">
            The row total is a per-person amount. The system multiplies it by
            total passengers in the quote summary.
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Section Group Total
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
          const perPersonTotal = rowTotal(row);

          return (
            <div key={index} className="rounded-xl border bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Item
                    </span>

                    <input
                      className="w-full rounded-md border p-2"
                      placeholder="Lunches / Dinners / Whisper Set"
                      value={row.label}
                      onChange={(e) =>
                        onUpdateRow(index, { label: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Cost Per Person
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.amountPerUnit}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          amountPerUnit: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Quantity / Days / Units
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.quantity}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          quantity: toNumber(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="lg:col-span-4">
                  <CostBreakdownCard
                    title="Fixed Cost Calculation"
                    lines={[
                      {
                        label: "Cost Per Person",
                        value: formatMoney(
                          toNumber(row.amountPerUnit),
                          currency
                        ),
                      },
                      {
                        label: "Quantity / Days / Units",
                        value: toNumber(row.quantity),
                      },
                    ]}
                    totalLabel="Per Person Total"
                    total={formatMoney(perPersonTotal, currency)}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
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
          );
        })}
      </div>
    </section>
  );
}