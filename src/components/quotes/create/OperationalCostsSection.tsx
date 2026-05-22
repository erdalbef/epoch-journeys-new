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
  dailyRate: number;
  numberOfDays: number;
};

type Props = {
  rows: OperationalCostRow[];
  currency: string;
  totalPassengers: number;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<OperationalCostRow>) => void;
  rowTotal: (row: OperationalCostRow) => number;
  rowPerPerson: (row: OperationalCostRow, totalPassengers: number) => number;
  sectionTotal: number;
  formatMoney: (amount: number, currency?: string) => string;
  toNumber: (value: unknown) => number;
};

const categories: Array<{
  value: OperationalCostRow["category"];
  label: string;
}> = [
  { value: "BUS", label: "Bus" },
  { value: "TOUR_GUIDE", label: "Tour Guide" },
  { value: "TOUR_MANAGER", label: "Tour Manager" },
  { value: "DRIVER", label: "Driver" },
  { value: "FERRY", label: "Ferry" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "OTHER", label: "Other" },
];

export default function OperationalCostsSection({
  rows,
  currency,
  totalPassengers,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  rowTotal,
  rowPerPerson,
  sectionTotal,
  formatMoney,
  toNumber,
}: Props) {
  const sectionPerPerson =
    Math.max(toNumber(totalPassengers), 1) > 0
      ? sectionTotal / Math.max(toNumber(totalPassengers), 1)
      : 0;

  return (
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Variable / Operational Costs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter service category, daily rate, and number of days. The system
            calculates total cost and per-person cost.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Add Row
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-slate-50 p-3 text-sm">
          <div className="text-slate-500">Operational Section Total</div>
          <div className="font-semibold">
            {formatMoney(sectionTotal, currency)}
          </div>
        </div>

        <div className="rounded-md border bg-slate-50 p-3 text-sm">
          <div className="text-slate-500">Operational Cost / Person</div>
          <div className="font-semibold">
            {formatMoney(sectionPerPerson, currency)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const total = rowTotal(row);
          const perPerson = rowPerPerson(row, totalPassengers);

          return (
            <div
              key={index}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-6"
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Service / Category
                </span>
                <select
                  className="w-full rounded-md border p-2"
                  value={row.category}
                  onChange={(e) =>
                    onUpdateRow(index, {
                      category: e.target.value as OperationalCostRow["category"],
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  Service Name
                </span>
                <input
                  className="w-full rounded-md border p-2"
                  value={row.label}
                  onChange={(e) =>
                    onUpdateRow(index, { label: e.target.value })
                  }
                  placeholder="e.g. Bus, Guide, Ferry"
                />
              </label>

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

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  No. of Days
                </span>
                <input
                  type="number"
                  className="w-full rounded-md border p-2"
                  value={row.numberOfDays}
                  onChange={(e) =>
                    onUpdateRow(index, {
                      numberOfDays: toNumber(e.target.value),
                    })
                  }
                />
              </label>

              <div className="rounded-md border bg-slate-50 p-2 text-sm">
                <div>
                  <span className="text-slate-500">Total:</span>{" "}
                  <span className="font-semibold">
                    {formatMoney(total, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Per Person:</span>{" "}
                  <span className="font-semibold">
                    {formatMoney(perPerson, currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onRemoveRow(index)}
                  disabled={rows.length === 1}
                  className="w-full rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
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
