"use client";

type OperationalCostRow = {
  label: string;
  category:
    | "BUS"
    | "TOUR_GUIDE"
    | "TOUR_MANAGER"
    | "DRIVER"
    | "FERRY"
    | "TRANSFER"
    | "OTHER";

  totalCost: number;
};

type Props = {
  rows: OperationalCostRow[];
  currency: string;

  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (
    index: number,
    patch: Partial<OperationalCostRow>
  ) => void;

  rowTotal: (row: OperationalCostRow) => number;
  sectionTotal: number;

  formatMoney: (amount: number, currency?: string) => string;
  toNumber: (value: unknown) => number;
};

const CATEGORY_OPTIONS: OperationalCostRow["category"][] = [
  "BUS",
  "TOUR_GUIDE",
  "TOUR_MANAGER",
  "DRIVER",
  "FERRY",
  "TRANSFER",
  "OTHER",
];

function formatCategoryLabel(category: OperationalCostRow["category"]) {
  return category
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OperationalCostsSection({
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
    <section className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between bg-[#8B0000] px-5 py-3 text-white">
        <div>
          <h2 className="text-lg font-semibold">Operational / Variable Costs</h2>
          <p className="mt-1 text-xs text-white/80">
            Group-level costs entered as total amounts. These are not multiplied
            again by passengers.
          </p>
        </div>

        <div className="text-sm font-semibold">
          Total: {formatMoney(sectionTotal, currency)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Total Cost</th>
              <th className="p-3 text-left">Row Total</th>
              <th className="p-3 text-left" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="p-3">
                  <input
                    className="w-full rounded-md border p-2"
                    value={row.label}
                    onChange={(e) =>
                      onUpdateRow(index, {
                        label: e.target.value,
                      })
                    }
                    placeholder="e.g. Bus 1, Guide 1 expenses, Driver hotel"
                  />
                </td>

                <td className="p-3">
                  <select
                    className="w-full rounded-md border p-2"
                    value={row.category}
                    onChange={(e) =>
                      onUpdateRow(index, {
                        category:
                          e.target.value as OperationalCostRow["category"],
                      })
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatCategoryLabel(option)}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="w-45 p-3">
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
                </td>

                <td className="p-3 font-medium">
                  {formatMoney(rowTotal(row), currency)}
                </td>

                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    disabled={rows.length === 1}
                    className="text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t bg-slate-50 px-5 py-4">
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

export type { OperationalCostRow };