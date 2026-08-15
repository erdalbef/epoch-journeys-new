"use client";

export type FixedCostCategory =
  | "ENTRANCE"
  | "LUNCH"
  | "DINNER"
  | "BOTTLED_WATER"
  | "FLIGHT"
  | "CRUISE"
  | "TIPS"
  | "PORTERAGE"
  | "HEADSETS"
  | "MASS_CHURCH"
  | "LOCAL_TRANSPORT"
  | "OTHER";

export type FixedCostRow = {
  label: string;
  category: FixedCostCategory;
  quantity: number;
  unitCost: number;
};

type Props = {
  rows: FixedCostRow[];

  currency: string;

  onAddRow: () => void;

  onRemoveRow: (index: number) => void;

  onUpdateRow: (
    index: number,
    patch: Partial<FixedCostRow>
  ) => void;

  rowTotal: (row: FixedCostRow) => number;

  sectionTotal: number;

  formatMoney: (
    amount: number,
    currency?: string
  ) => string;

  toNumber: (value: unknown) => number;
};
const CATEGORY_OPTIONS: Array<{
  value: FixedCostCategory;
  label: string;
}> = [
  {
    value: "ENTRANCE",
    label: "Entrance / Admission",
  },
  {
    value: "LUNCH",
    label: "Lunch",
  },
  {
    value: "DINNER",
    label: "Dinner",
  },
  {
    value: "BOTTLED_WATER",
    label: "Bottled Water",
  },
  {
    value: "FLIGHT",
    label: "Airfare / Domestic Flight",
  },
  {
    value: "CRUISE",
    label: "Cruise / Boat",
  },
  {
    value: "TIPS",
    label: "Tips / Gratuities",
  },
  {
    value: "PORTERAGE",
    label: "Porterage",
  },
  {
    value: "HEADSETS",
    label: "Headsets / Audio System",
  },
  {
    value: "MASS_CHURCH",
    label: "Mass / Church Donation",
  },
  {
    value: "LOCAL_TRANSPORT",
    label: "Local Transportation",
  },
  {
    value: "OTHER",
    label: "Other Per-Person Cost",
  },
];

const QUICK_ADD_OPTIONS: Array<{
  label: string;
  category: FixedCostCategory;
  description: string;
}> = [
  {
    label: "Bottled Water",
    category: "BOTTLED_WATER",
    description: "Daily bottled water",
  },
  {
    label: "Airfare",
    category: "FLIGHT",
    description: "Domestic or regional airfare",
  },
  {
    label: "Tips",
    category: "TIPS",
    description: "Guide / driver gratuities",
  },
  {
    label: "Headsets",
    category: "HEADSETS",
    description: "Whisper / audio system",
  },
  {
    label: "Porterage",
    category: "PORTERAGE",
    description: "Hotel porterage",
  },
  {
    label: "Mass",
    category: "MASS_CHURCH",
    description: "Mass / church donation",
  },
];

function getCategoryLabel(
  category: FixedCostCategory
) {
  return (
    CATEGORY_OPTIONS.find(
      (option) => option.value === category
    )?.label ?? category
  );
}

export default function FixedCostsSection({
  rows,
  currency,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  rowTotal,
  sectionTotal,
  formatMoney,
  toNumber,
}: Props) {
  function addQuickCost(
    category: FixedCostCategory,
    label: string
  ) {
    onAddRow();

    /*
     * onAddRow creates the new row in the parent.
     * React state updates asynchronously, so we update
     * the new row on the next event loop.
     */
    window.setTimeout(() => {
      onUpdateRow(rows.length, {
        category,
        label,
        quantity: 1,
        unitCost: 0,
      });
    }, 0);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              Pilgrimage Costing
            </div>

            <h2 className="mt-1 text-lg font-semibold">
              Per-Person Service Costs
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-200">
              Add services charged for each traveler,
              including entrances, meals, bottled water,
              airfare, tips, porterage, headsets and
              church-related costs.
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-blue-100">
              Cost Per Traveler
            </div>

            <div className="mt-1 text-xl font-semibold">
              {formatMoney(sectionTotal, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* EXPLANATION */}
      <div className="border-b bg-blue-50 px-5 py-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[#001F3F]">
              How this section works
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Enter the cost of services that apply to
              each traveler. For example, if bottled
              water costs €2 per day for 10 days, enter
              quantity 10 and unit cost €2.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-[#001F3F]">
              Complimentary travelers
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              These costs also apply to complimentary
              travelers where applicable. Their cost is
              recovered across the paying pilgrims by
              the quote calculator.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK ADD */}
      <div className="border-b bg-slate-50 px-5 py-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">
            Quick Add
          </p>

          <p className="text-xs text-slate-500">
            Add common pilgrimage costs with one click.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_ADD_OPTIONS.map((option) => (
            <button
              key={option.category}
              type="button"
              onClick={() =>
                addQuickCost(
                  option.category,
                  option.description
                )
              }
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              + {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Service
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Category
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Qty
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Unit Cost
              </th>

              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Cost / Traveler
              </th>

              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center"
                >
                  <div className="text-sm font-medium text-slate-700">
                    No per-person costs added yet.
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Use Quick Add above or add a custom
                    service below.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b last:border-b-0 hover:bg-slate-50/70"
                >
                  {/* DESCRIPTION */}
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-md border border-slate-300 bg-white p-2 outline-none transition focus:border-[#001F3F]"
                      value={row.label}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          label: e.target.value,
                        })
                      }
                      placeholder="e.g. Ephesus entrance"
                    />
                  </td>

                  {/* CATEGORY */}
                  <td className="px-4 py-3">
                    <select
                      className="w-full rounded-md border border-slate-300 bg-white p-2 outline-none transition focus:border-[#001F3F]"
                      value={row.category}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          category:
                            e.target
                              .value as FixedCostCategory,
                        })
                      }
                    >
                      {CATEGORY_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  {/* QTY */}
                  <td className="w-28 px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-right outline-none transition focus:border-[#001F3F]"
                      value={row.quantity}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          quantity: toNumber(
                            e.target.value
                          ),
                        })
                      }
                    />
                  </td>

                  {/* UNIT COST */}
                  <td className="w-40 px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {currency}
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-12 pr-2 text-right outline-none transition focus:border-[#001F3F]"
                        value={row.unitCost}
                        onChange={(e) =>
                          onUpdateRow(index, {
                            unitCost: toNumber(
                              e.target.value
                            ),
                          })
                        }
                      />
                    </div>
                  </td>

                  {/* TOTAL */}
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-[#001F3F]">
                      {formatMoney(
                        rowTotal(row),
                        currency
                      )}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      {getCategoryLabel(row.category)}
                    </div>
                  </td>

                  {/* REMOVE */}
                  <td className="w-24 px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onRemoveRow(index)
                      }
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="border-t bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-slate-500">
              Total per-person services
            </div>

            <div className="text-lg font-bold text-[#001F3F]">
              {formatMoney(sectionTotal, currency)}
            </div>
          </div>

          <button
            type="button"
            onClick={onAddRow}
            className="rounded-md border border-[#001F3F] bg-white px-4 py-2 text-sm font-medium text-[#001F3F] transition hover:bg-[#001F3F] hover:text-white"
          >
            + Add Custom Cost
          </button>
        </div>
      </div>
    </section>
  );
}