"use client";

type HotelRow = {
  hotelName: string;
  destination: string;
  nights: number;
  singlePerPerson: number;
  doubleTwinPerPerson: number;
  triplePerPerson: number;
  stayType: "CORE" | "PRE" | "POST";
};

type Props = {
  hotels: HotelRow[];
  currency: string;
  onAddHotel: () => void;
  onRemoveHotel: (index: number) => void;
  onUpdateHotel: (
    index: number,
    patch: Partial<HotelRow>
  ) => void;
  hotelCostPerPerson: (
    row: HotelRow,
    occupancy: "single" | "doubleTwin" | "triple"
  ) => number;
  formatMoney: (
    amount: number,
    currency?: string
  ) => string;
  toNumber: (value: unknown) => number;
};

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

function getStayBadge(
  stayType: HotelRow["stayType"]
) {
  switch (stayType) {
    case "PRE":
      return {
        label: "PRE-STAY",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "POST":
      return {
        label: "POST-STAY",
        className:
          "bg-purple-100 text-purple-800",
      };

    case "CORE":
    default:
      return {
        label: "CORE",
        className:
          "bg-blue-100 text-blue-800",
      };
  }
}

export default function HotelsSection({
  hotels,
  currency,
  onAddHotel,
  onRemoveHotel,
  onUpdateHotel,
  hotelCostPerPerson,
  formatMoney,
  toNumber,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      {/* HEADER */}
      <div className="flex flex-col gap-3 bg-[#001F3F] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Hotels
          </h2>

          <p className="mt-1 max-w-4xl text-xs text-slate-200">
            Core hotels affect the main tour price.
            Pre- and post-stay hotels are optional
            per-person add-ons and remain separate from
            the main tour NET rate.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddHotel}
          className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          + Add Hotel
        </button>
      </div>

      {/* HOTEL ROWS */}
      <div className="space-y-5 p-5">
        {hotels.map((row, index) => {
          const singleTotal =
            hotelCostPerPerson(
              row,
              "single"
            );

          const doubleTwinTotal =
            hotelCostPerPerson(
              row,
              "doubleTwin"
            );

          const tripleTotal =
            hotelCostPerPerson(
              row,
              "triple"
            );

          const colorIndex =
            index % rowBackgrounds.length;

          const rowBackground =
            rowBackgrounds[colorIndex];

          const rowHeaderBackground =
            rowHeaderBackgrounds[colorIndex];

          const stayBadge =
            getStayBadge(
              row.stayType
            );

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
                      {row.hotelName ||
                        row.destination ||
                        "Hotel"}
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${stayBadge.className}`}
                    >
                      {stayBadge.label}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {row.stayType === "CORE"
                      ? "Included in the main tour costing"
                      : row.stayType === "PRE"
                        ? "Optional pre-stay accommodation"
                        : "Optional post-stay accommodation"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">
                      Single:{" "}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        singleTotal,
                        currency
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">
                      Double/Twin:{" "}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        doubleTwinTotal,
                        currency
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">
                      Triple:{" "}
                    </span>

                    <span className="font-semibold">
                      {formatMoney(
                        tripleTotal,
                        currency
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-4">
                {/* BASIC HOTEL DETAILS */}
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Stay Type
                    </span>

                    <select
                      className="w-full rounded-md border bg-white p-2"
                      value={row.stayType}
                      onChange={(e) =>
                        onUpdateHotel(index, {
                          stayType:
                            e.target
                              .value as HotelRow["stayType"],
                        })
                      }
                    >
                      <option value="CORE">
                        Core Tour Hotel
                      </option>

                      <option value="PRE">
                        Pre-Stay Add-On
                      </option>

                      <option value="POST">
                        Post-Stay Add-On
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Hotel Name
                    </span>

                    <input
                      className="w-full rounded-md border bg-white p-2"
                      value={row.hotelName}
                      onChange={(e) =>
                        onUpdateHotel(index, {
                          hotelName:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Athens 4★ Hotel"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      Destination / City
                    </span>

                    <input
                      className="w-full rounded-md border bg-white p-2"
                      value={row.destination}
                      onChange={(e) =>
                        onUpdateHotel(index, {
                          destination:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Athens"
                    />
                  </label>
                </div>

                {/* RATE INPUTS */}
                <div className="rounded-lg border bg-white/80 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Nights
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full rounded-md border bg-white p-2"
                        value={row.nights}
                        onChange={(e) =>
                          onUpdateHotel(index, {
                            nights:
                              toNumber(
                                e.target.value
                              ),
                          })
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Single / Person / Night
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.singlePerPerson
                        }
                        onChange={(e) =>
                          onUpdateHotel(index, {
                            singlePerPerson:
                              toNumber(
                                e.target.value
                              ),
                          })
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Double/Twin / Person / Night
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.doubleTwinPerPerson
                        }
                        onChange={(e) =>
                          onUpdateHotel(index, {
                            doubleTwinPerPerson:
                              toNumber(
                                e.target.value
                              ),
                          })
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Triple / Person / Night
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white p-2"
                        value={
                          row.triplePerPerson
                        }
                        onChange={(e) =>
                          onUpdateHotel(index, {
                            triplePerPerson:
                              toNumber(
                                e.target.value
                              ),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* CALCULATED TOTALS */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-white p-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Single Hotel Cost / Person
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#001F3F]">
                      {formatMoney(
                        singleTotal,
                        currency
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border bg-white p-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Double/Twin Hotel Cost / Person
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#001F3F]">
                      {formatMoney(
                        doubleTwinTotal,
                        currency
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border bg-white p-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Triple Hotel Cost / Person
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#001F3F]">
                      {formatMoney(
                        tripleTotal,
                        currency
                      )}
                    </div>
                  </div>
                </div>

                {/* OPTIONAL NOTE */}
                {row.stayType !== "CORE" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">
                      Optional{" "}
                      {row.stayType === "PRE"
                        ? "Pre-Stay"
                        : "Post-Stay"}{" "}
                      Accommodation
                    </div>

                    <p className="mt-1 text-sm text-amber-800">
                      These hotel rates will be shown
                      separately in the proposal and will
                      not increase the main tour NET rate.
                    </p>
                  </div>
                )}

                {/* FOOTER */}
                <div className="flex flex-col gap-3 border-t border-slate-300/70 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-600">
                    {row.stayType === "CORE" ? (
                      <>
                        Included in the main tour
                        accommodation costing.
                      </>
                    ) : (
                      <>
                        Separate optional{" "}
                        {row.stayType === "PRE"
                          ? "pre-stay"
                          : "post-stay"}{" "}
                        rate.
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onRemoveHotel(index)
                    }
                    disabled={
                      hotels.length === 1
                    }
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove Hotel
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
            onClick={onAddHotel}
            className="rounded-lg border-2 border-dashed border-[#001F3F]/30 bg-slate-50 px-8 py-3 text-sm font-semibold text-[#001F3F] transition hover:border-[#001F3F]/60 hover:bg-blue-50"
          >
            + Add Another Hotel
          </button>
        </div>
      </div>
    </section>
  );
}