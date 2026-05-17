"use client";

import CostBreakdownCard from "@/components/quotes/create/CostBreakdownCard";

type VariableCostRow = {
  label: string;
  totalCost: number;
  costBasis: "GROUP" | "PER_PERSON";
};

type Props = {
  rows: VariableCostRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<VariableCostRow>) => void;

  total: number;
  currency: string;
  totalPassengers: number;

  toNumber: (value: unknown) => number;
  formatMoney: (value: number, currency: string) => string;
};

export default function VariableCostsSection({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  total,
  currency,
  totalPassengers,
  toNumber,
  formatMoney,
}: Props) {
  function rowTotal(row: VariableCostRow) {
    if (row.costBasis === "PER_PERSON") {
      return toNumber(row.totalCost) * totalPassengers;
    }

    return toNumber(row.totalCost);
  }

  function rowFormula(row: VariableCostRow) {
    if (row.costBasis === "PER_PERSON") {
      return "Amount Per Person × Total Passengers";
    }

    return "Group Total";
  }

  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-orange-700">
            Variable Costs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Use this for group-level or passenger-based costs such as buses,
            ferries, flights, luggage trucks, porterage, or other operational
            costs.
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Group Total = entered once. Per Person = multiplied by total
            passengers.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            These costs are later divided across passengers inside the quote
            calculation.
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Variable Section Total
          </div>

          <div className="text-lg font-semibold text-slate-800">
            {formatMoney(total, currency)}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Based on {totalPassengers} passengers
          </div>
        </div>
      </div>

      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          + Add Cost
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const totalForRow = rowTotal(row);

          return (
            <div key={index} className="rounded-xl border bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Cost Item
                    </span>

                    <input
                      className="w-full rounded-md border p-2"
                      placeholder="Bus / Ferry / Flights / Other"
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
                      Amount
                    </span>

                    <input
                      type="number"
                      className="w-full rounded-md border p-2"
                      value={row.totalCost}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          totalCost: toNumber(e.target.value),
                        })
                      }
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Depends on selected type
                    </p>
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Type
                    </span>

                    <select
                      className="w-full rounded-md border p-2"
                      value={row.costBasis}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          costBasis: e.target.value as "GROUP" | "PER_PERSON",
                        })
                      }
                    >
                      <option value="GROUP">Group Total</option>
                      <option value="PER_PERSON">Per Person</option>
                    </select>

                    <p className="mt-1 text-xs text-slate-500">
                      {row.costBasis === "GROUP"
                        ? "One total amount for the group"
                        : "Amount multiplied by passengers"}
                    </p>
                  </label>
                </div>

                <div className="lg:col-span-4">
                  <CostBreakdownCard
                    title="Variable Cost Calculation"
                    lines={[
                      {
                        label:
                          row.costBasis === "GROUP"
                            ? "Group Amount"
                            : "Amount Per Person",
                        value: formatMoney(toNumber(row.totalCost), currency),
                      },
                      {
                        label: "Cost Type",
                        value:
                          row.costBasis === "GROUP"
                            ? "Group Total"
                            : "Per Person",
                      },
                      {
                        label: "Formula",
                        value: rowFormula(row),
                      },
                      ...(row.costBasis === "PER_PERSON"
                        ? [
                            {
                              label: "Passengers",
                              value: totalPassengers,
                            },
                          ]
                        : []),
                    ]}
                    totalLabel="Row Total"
                    total={formatMoney(totalForRow, currency)}
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