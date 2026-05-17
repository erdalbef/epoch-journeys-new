"use client";

type FixedCostRow = {
  label: string;
  category:
    | "HOTEL"
    | "ENTRANCE"
    | "LUNCH"
    | "DINNER"
    | "FLIGHT"
    | "CRUISE"
    | "TIPS"
    | "OTHER";

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

  formatMoney: (amount: number, currency?: string) => string;

  toNumber: (value: unknown) => number;
};

const CATEGORY_OPTIONS: FixedCostRow["category"][] = [
  "HOTEL",
  "ENTRANCE",
  "LUNCH",
  "DINNER",
  "FLIGHT",
  "CRUISE",
  "TIPS",
  "OTHER",
];

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
  return (
    <section className="rounded-xl border overflow-hidden">
      {/* HEADER */}
      <div className="bg-[#001F3F] text-white px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Fixed Costs
          </h2>

          <p className="text-xs text-slate-200">
            Per person costs automatically multiplied by passengers
          </p>
        </div>

        <div className="text-sm font-semibold">
          Total: {formatMoney(sectionTotal, currency)}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Qty</th>
              <th className="p-3 text-left">Unit Cost</th>
              <th className="p-3 text-left">Row Total</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-t"
              >
                {/* DESCRIPTION */}
                <td className="p-3">
                  <input
                    className="w-full rounded-md border p-2"
                    value={row.label}
                    onChange={(e) =>
                      onUpdateRow(index, {
                        label: e.target.value,
                      })
                    }
                    placeholder="e.g. Ephesus Entrance"
                  />
                </td>

                {/* CATEGORY */}
                <td className="p-3">
                  <select
                    className="w-full rounded-md border p-2"
                    value={row.category}
                    onChange={(e) =>
                      onUpdateRow(index, {
                        category:
                          e.target.value as FixedCostRow["category"],
                      })
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                </td>

                {/* QTY */}
                <td className="p-3 w-30">
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
                </td>

                {/* UNIT COST */}
                <td className="p-3 w-40">
                  <input
                    type="number"
                    className="w-full rounded-md border p-2"
                    value={row.unitCost}
                    onChange={(e) =>
                      onUpdateRow(index, {
                        unitCost: toNumber(e.target.value),
                      })
                    }
                  />
                </td>

                {/* TOTAL */}
                <td className="p-3 font-medium">
                  {formatMoney(
                    rowTotal(row),
                    currency
                  )}
                </td>

                {/* REMOVE */}
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="border-t bg-slate-50 px-5 py-4 flex justify-end">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border px-4 py-2 text-sm hover:bg-white"
        >
          Add Row
        </button>
      </div>
    </section>
  );
}