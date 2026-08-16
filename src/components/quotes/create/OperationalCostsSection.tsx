"use client";

export type OperationalCostCategory =
  | "BUS"
  | "TOUR_GUIDE"
  | "TOUR_MANAGER"
  | "ASSISTANT"
  | "TRANSFERMAN"
  | "DRIVER"
  | "FERRY"
  | "TRANSFER"
  | "OTHER";

export type OperationalCostScope =
  | "CORE"
  | "PRE"
  | "POST";

export type OperationalCostMode =
  | "TOTAL"
  | "DAILY";

export type OperationalPricingBasis =
  | "GROUP_TOTAL"
  | "PER_PERSON"
  | "PER_SERVICE"
  | "PER_VEHICLE";

export type OperationalCostRow = {
  label: string;

  category: OperationalCostCategory;

  /**
   * CORE:
   * Included in the main tour costing.
   *
   * PRE / POST:
   * Optional services shown separately and not included
   * in the main tour NET rate.
   */
  scope: OperationalCostScope;

  /**
   * TOTAL:
   * Supplier gives one total contract price.
   *
   * DAILY:
   * Rate × quantity/days.
   */
  costMode: OperationalCostMode;

  /**
   * How the service should be presented / sold.
   */
  pricingBasis: OperationalPricingBasis;

  totalContractCost: number;

  dailyRate: number;
  numberOfDays: number;

  /**
   * Staff expenses.
   */
  hotelPerNight: number;
  hotelNights: number;

  airfareTransport: number;

  mealsPerDay: number;
  mealDays: number;

  otherExpenses: number;
};

type Props = {
  rows: OperationalCostRow[];

  currency: string;

  payingPassengers: number;

  onAddRow: () => void;

  onRemoveRow: (index: number) => void;

  onUpdateRow: (
    index: number,
    patch: Partial<OperationalCostRow>
  ) => void;

  rowTotal: (row: OperationalCostRow) => number;

  rowPerPerson: (row: OperationalCostRow) => number;

  sectionTotal: number;

  formatMoney: (
    amount: number,
    currency?: string
  ) => string;

  toNumber: (value: unknown) => number;
};

const categories: Array<{
  value: OperationalCostCategory;
  label: string;
}> = [
  {
    value: "BUS",
    label: "Bus / Coach",
  },
  {
    value: "TOUR_GUIDE",
    label: "Tour Guide",
  },
  {
    value: "TOUR_MANAGER",
    label: "Tour Manager",
  },
  {
    value: "ASSISTANT",
    label: "Assistant",
  },
  {
    value: "TRANSFERMAN",
    label: "Transferman",
  },
  {
    value: "DRIVER",
    label: "Driver",
  },
  {
    value: "FERRY",
    label: "Ferry",
  },
  {
    value: "TRANSFER",
    label: "Transportation / Transfer",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const scopeOptions: Array<{
  value: OperationalCostScope;
  label: string;
}> = [
  {
    value: "CORE",
    label: "Core Tour",
  },
  {
    value: "PRE",
    label: "Pre-Stay",
  },
  {
    value: "POST",
    label: "Post-Stay",
  },
];

const pricingBasisOptions: Array<{
  value: OperationalPricingBasis;
  label: string;
}> = [
  {
    value: "GROUP_TOTAL",
    label: "Group Total",
  },
  {
    value: "PER_PERSON",
    label: "Per Person",
  },
  {
    value: "PER_SERVICE",
    label: "Per Service",
  },
  {
    value: "PER_VEHICLE",
    label: "Per Vehicle",
  },
];

/**
 * Soft alternating colors are used only to make long
 * quotation forms easier to follow visually.
 *
 * They do NOT indicate CORE / PRE / POST status.
 */
const rowBackgrounds = [
  "bg-amber-50/70 border-amber-200",
  "bg-emerald-50/60 border-emerald-200",
  "bg-white border-slate-200",
  "bg-blue-50/60 border-blue-200",
];

const rowHeaderBackgrounds = [
  "bg-amber-100/60 border-amber-200",
  "bg-emerald-100/50 border-emerald-200",
  "bg-slate-50 border-slate-200",
  "bg-blue-100/50 border-blue-200",
];

function supportsDetailedExpenses(
  category: OperationalCostCategory
) {
  return (
    category === "TOUR_MANAGER" ||
    category === "TOUR_GUIDE" ||
    category === "ASSISTANT" ||
    category === "DRIVER"
  );
}

function defaultCostMode(
  category: OperationalCostCategory
): OperationalCostMode {
  if (
    category === "BUS" ||
    category === "FERRY" ||
    category === "TRANSFER" ||
    category === "TRANSFERMAN" ||
    category === "OTHER"
  ) {
    return "TOTAL";
  }

  return "DAILY";
}

function defaultPricingBasis(
  category: OperationalCostCategory
): OperationalPricingBasis {
  switch (category) {
    case "TRANSFER":
      return "PER_VEHICLE";

    case "TRANSFERMAN":
      return "PER_SERVICE";

    case "FERRY":
      return "PER_PERSON";

    default:
      return "GROUP_TOTAL";
  }
}

function pricingBasisLabel(
  basis: OperationalPricingBasis
) {
  switch (basis) {
    case "PER_PERSON":
      return "per person";

    case "PER_SERVICE":
      return "per service";

    case "PER_VEHICLE":
      return "per vehicle";

    case "GROUP_TOTAL":
    default:
      return "group total";
  }
}

export default function OperationalCostsSection({
  rows,
  currency,
  payingPassengers,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  rowTotal,
  rowPerPerson,
  sectionTotal,
  formatMoney,
  toNumber,
}: Props) {
  const safePayingPassengers = Math.max(
    Math.floor(toNumber(payingPassengers)),
    1
  );

  /**
   * sectionTotal should contain CORE operational costs only.
   * PRE and POST rows must not be included by the parent form
   * when calculating this value.
   */
  const sectionPerPayingPilgrim =
    sectionTotal / safePayingPassengers;

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      {/* HEADER */}
      <div className="flex flex-col gap-3 bg-[#001F3F] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Operational & Staff Costs
          </h2>

          <p className="mt-1 max-w-4xl text-xs text-slate-200">
            Core operational costs contribute to the main tour NET rate.
            Pre- and post-stay services are optional add-ons and are quoted
            separately.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          + Add Operational Cost
        </button>
      </div>

      {/* CORE SUMMARY */}
      <div className="grid gap-4 border-b bg-slate-50 p-5 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Core Operational Total
          </div>

          <div className="mt-1 text-xl font-bold text-[#001F3F]">
            {formatMoney(sectionTotal, currency)}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Paying Pilgrims
          </div>

          <div className="mt-1 text-xl font-bold text-[#001F3F]">
            {safePayingPassengers}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Core Operational Cost / Paying Pilgrim
          </div>

          <div className="mt-1 text-xl font-bold text-[#001F3F]">
            {formatMoney(
              sectionPerPayingPilgrim,
              currency
            )}
          </div>
        </div>
      </div>

      {/* ROWS */}
      <div className="space-y-5 p-5">
        {rows.map((row, index) => {
          const total = rowTotal(row);

          const perPerson =
            row.scope === "CORE"
              ? rowPerPerson(row)
              : 0;

          const detailedExpenses =
            supportsDetailedExpenses(row.category);

          const isOptional =
            row.scope === "PRE" ||
            row.scope === "POST";

          const colorIndex =
            index % rowBackgrounds.length;

          const rowBackground =
            rowBackgrounds[colorIndex];

          const rowHeaderBackground =
            rowHeaderBackgrounds[colorIndex];

          return (
            <div
              key={index}
              className={`overflow-hidden rounded-xl border-2 shadow-sm ${rowBackground}`}
            >
              {/* ROW HEADER */}
              <div
                className={`flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between ${rowHeaderBackground}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      Row {index + 1}
                    </span>

                    <div className="font-semibold text-[#001F3F]">
                      {row.label ||
                        categories.find(
                          (item) =>
                            item.value === row.category
                        )?.label ||
                        "Operational Cost"}
                    </div>

                    {row.scope === "CORE" && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-800">
                        CORE
                      </span>
                    )}

                    {row.scope === "PRE" && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        PRE-STAY
                      </span>
                    )}

                    {row.scope === "POST" && (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-800">
                        POST-STAY
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {row.scope === "CORE"
                      ? "Internal core tour costing"
                      : "Optional add-on — excluded from main tour NET rate"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 text-sm">
                  <div>
                    <span className="text-slate-500">
                      Total:{" "}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(total, currency)}
                    </span>
                  </div>

                  {row.scope === "CORE" ? (
                    <div>
                      <span className="text-slate-500">
                        Cost / Paying Pilgrim:{" "}
                      </span>

                      <span className="font-semibold text-[#001F3F]">
                        {formatMoney(
                          perPerson,
                          currency
                        )}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-500">
                        Quoted as:{" "}
                      </span>

                      <span className="font-semibold text-[#001F3F]">
                        {formatMoney(
                          total,
                          currency
                        )}{" "}
                        {pricingBasisLabel(
                          row.pricingBasis
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5 p-4">
                {/* BASIC INFORMATION */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Cost Scope
                    </span>

                    <select
                      className="w-full rounded-md border bg-white p-2"
                      value={row.scope}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          scope:
                            e.target
                              .value as OperationalCostScope,
                        })
                      }
                    >
                      {scopeOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Service / Category
                    </span>

                    <select
                      className="w-full rounded-md border bg-white p-2"
                      value={row.category}
                      onChange={(e) => {
                        const category =
                          e.target
                            .value as OperationalCostCategory;

                        onUpdateRow(index, {
                          category,
                          costMode:
                            defaultCostMode(category),
                          pricingBasis:
                            defaultPricingBasis(category),
                        });
                      }}
                    >
                      {categories.map((category) => (
                        <option
                          key={category.value}
                          value={category.value}
                        >
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
                      className="w-full rounded-md border bg-white p-2"
                      value={row.label}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          label: e.target.value,
                        })
                      }
                      placeholder="e.g. Athens Airport Transfer"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Cost Entry Method
                    </span>

                    <select
                      className="w-full rounded-md border bg-white p-2"
                      value={row.costMode}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          costMode:
                            e.target
                              .value as OperationalCostMode,
                        })
                      }
                    >
                      <option value="TOTAL">
                        Total Cost
                      </option>

                      <option value="DAILY">
                        Rate × Quantity / Days
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Quotation Basis
                    </span>

                    <select
                      className="w-full rounded-md border bg-white p-2"
                      value={row.pricingBasis}
                      onChange={(e) =>
                        onUpdateRow(index, {
                          pricingBasis:
                            e.target
                              .value as OperationalPricingBasis,
                        })
                      }
                    >
                      {pricingBasisOptions.map(
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
                  </label>
                </div>

                {/* COST ENTRY */}
                <div className="rounded-lg border bg-white/80 p-4">
                  {row.costMode === "TOTAL" ? (
                    <div className="max-w-sm">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Total Cost
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.totalContractCost}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              totalContractCost:
                                toNumber(
                                  e.target.value
                                ),
                            })
                          }
                          placeholder="e.g. 9600"
                        />
                      </label>

                      <p className="mt-2 text-xs text-slate-500">
                        Use this when the supplier gives one total amount
                        for the service.
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-w-2xl gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Rate
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.dailyRate}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              dailyRate:
                                toNumber(
                                  e.target.value
                                ),
                            })
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Quantity / Days / Services
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.numberOfDays}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              numberOfDays:
                                toNumber(
                                  e.target.value
                                ),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* STAFF EXPENSES */}
                {detailedExpenses && (
                  <div className="rounded-lg border border-blue-100 bg-white/70 p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold text-[#001F3F]">
                        Staff Expenses
                      </h3>

                      <p className="mt-1 text-xs text-slate-600">
                        Additional costs paid by Epoch for this staff member.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium">
                            Hotel / Night
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-md border bg-white p-2"
                            value={row.hotelPerNight}
                            onChange={(e) =>
                              onUpdateRow(index, {
                                hotelPerNight:
                                  toNumber(
                                    e.target.value
                                  ),
                              })
                            }
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium">
                            Nights
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="w-full rounded-md border bg-white p-2"
                            value={row.hotelNights}
                            onChange={(e) =>
                              onUpdateRow(index, {
                                hotelNights:
                                  toNumber(
                                    e.target.value
                                  ),
                              })
                            }
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium">
                          Airfare / Transportation
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.airfareTransport}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              airfareTransport:
                                toNumber(
                                  e.target.value
                                ),
                            })
                          }
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium">
                            Meals / Day
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-md border bg-white p-2"
                            value={row.mealsPerDay}
                            onChange={(e) =>
                              onUpdateRow(index, {
                                mealsPerDay:
                                  toNumber(
                                    e.target.value
                                  ),
                              })
                            }
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium">
                            Meal Days
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="w-full rounded-md border bg-white p-2"
                            value={row.mealDays}
                            onChange={(e) =>
                              onUpdateRow(index, {
                                mealDays:
                                  toNumber(
                                    e.target.value
                                  ),
                              })
                            }
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium">
                          Other Expenses
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border bg-white p-2"
                          value={row.otherExpenses}
                          onChange={(e) =>
                            onUpdateRow(index, {
                              otherExpenses:
                                toNumber(
                                  e.target.value
                                ),
                            })
                          }
                          placeholder="Taxi, visa, parking..."
                        />
                      </label>

                      <div className="rounded-md border bg-white p-3 text-sm">
                        <div className="text-xs text-slate-500">
                          Total Staff Cost
                        </div>

                        <div className="mt-1 font-semibold text-[#001F3F]">
                          {formatMoney(
                            total,
                            currency
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPTIONAL SERVICE EXPLANATION */}
                {isOptional && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">
                      Optional{" "}
                      {row.scope === "PRE"
                        ? "Pre-Stay"
                        : "Post-Stay"}{" "}
                      Service
                    </div>

                    <p className="mt-1 text-sm text-amber-800">
                      This service will be quoted separately and will not
                      increase the main tour NET rate.
                    </p>

                    <div className="mt-3 text-sm">
                      <span className="text-slate-600">
                        Client quotation:
                      </span>{" "}

                      <span className="font-semibold text-[#001F3F]">
                        {formatMoney(
                          total,
                          currency
                        )}{" "}
                        {pricingBasisLabel(
                          row.pricingBasis
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div className="flex flex-col gap-3 border-t border-slate-300/70 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-600">
                    {row.scope === "CORE" ? (
                      <>
                        Cost recovered over{" "}
                        <span className="font-semibold text-[#001F3F]">
                          {safePayingPassengers}
                        </span>{" "}
                        paying pilgrims.
                      </>
                    ) : (
                      <>
                        Separate optional{" "}
                        {row.scope === "PRE"
                          ? "pre-stay"
                          : "post-stay"}{" "}
                        service —{" "}
                        <span className="font-semibold">
                          not included in the core tour rate.
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onRemoveRow(index)
                    }
                    disabled={rows.length === 1}
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* BOTTOM ADD BUTTON */}
        <div className="flex justify-center border-t pt-5">
          <button
            type="button"
            onClick={onAddRow}
            className="rounded-lg border-2 border-dashed border-[#001F3F]/30 bg-slate-50 px-8 py-3 text-sm font-semibold text-[#001F3F] transition hover:border-[#001F3F]/60 hover:bg-blue-50"
          >
            + Add Another Operational Cost
          </button>
        </div>
      </div>
    </section>
  );
}