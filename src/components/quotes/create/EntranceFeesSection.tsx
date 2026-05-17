"use client";

import CostBreakdownCard from "@/components/quotes/create/CostBreakdownCard";

type EntranceRow = {
  siteName: string;
  amountPerPerson: number;
};

type Props = {
  entranceRows: EntranceRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<EntranceRow>) => void;
  total: number;
  currency: string;
  totalPassengers?: number;
  toNumber: (value: unknown) => number;
  formatMoney: (value: number, currency: string) => string;
};

export default function EntranceFeesSection({
  entranceRows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  total,
  currency,
  totalPassengers = 0,
  toNumber,
  formatMoney,
}: Props) {
  return (
    <section className="rounded-xl border p-5">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-700">
            Entrance Fees
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter the entrance fee per person for each site.
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Formula: Fee Per Person × Total Passengers
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Entrance Section Total
          </div>

          <div className="text-lg font-semibold text-slate-800">
            {formatMoney(total, currency)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Based on {totalPassengers} passengers
          </div>
        </div>
      </div>

      {/* ADD BUTTON */}
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          + Add Entrance
        </button>
      </div>

      {/* ROWS */}
      <div className="space-y-4">
        {entranceRows.map((row, index) => {
          const rowTotal =
            toNumber(row.amountPerPerson) * totalPassengers;

          return (
            <div
              key={index}
              className="rounded-xl border bg-white p-4"
            >
              <div className="grid gap-4 lg:grid-cols-12">
                {/* SITE NAME */}
                <div className="lg:col-span-5">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Site Name
                    </span>

                    <input
                      className="w-full rounded-md border p-2"
                      placeholder="e.g. Vatican Museums"
                      value={row.siteName}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          siteName: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                {/* AMOUNT */}
                <div className="lg:col-span-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Fee Per Person
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.amountPerPerson}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          amountPerPerson: toNumber(e.target.value),
                        })
                      }
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Per passenger entrance fee
                    </p>
                  </label>
                </div>

                {/* BREAKDOWN */}
                <div className="lg:col-span-4">
                  <CostBreakdownCard
                    title="Entrance Calculation"
                    lines={[
                      {
                        label: "Fee Per Person",
                        value: formatMoney(
                          toNumber(row.amountPerPerson),
                          currency
                        ),
                      },
                      {
                        label: "Passengers",
                        value: totalPassengers,
                      },
                    ]}
                    total={formatMoney(rowTotal, currency)}
                  />
                </div>
              </div>

              {/* REMOVE */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemoveRow(index)}
                  disabled={entranceRows.length === 1}
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