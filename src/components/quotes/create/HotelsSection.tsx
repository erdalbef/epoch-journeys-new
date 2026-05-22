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
  onUpdateHotel: (index: number, patch: Partial<HotelRow>) => void;
  hotelCostPerPerson: (
    row: HotelRow,
    occupancy: "single" | "doubleTwin" | "triple"
  ) => number;
  formatMoney: (amount: number, currency?: string) => string;
  toNumber: (value: unknown) => number;
};

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
    <section className="rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hotels</h2>
          <p className="mt-1 text-sm text-slate-500">
            Core hotels affect the main tour price. Pre/Post hotels are optional
            per-person add-ons and do not increase the main tour price.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddHotel}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Add Hotel
        </button>
      </div>

      <div className="space-y-4">
        {hotels.map((row, index) => {
          const singleTotal = hotelCostPerPerson(row, "single");
          const doubleTwinTotal = hotelCostPerPerson(row, "doubleTwin");
          const tripleTotal = hotelCostPerPerson(row, "triple");

          return (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Stay Type
                  </span>
                  <select
                    className="w-full rounded-md border p-2"
                    value={row.stayType}
                    onChange={(e) =>
                      onUpdateHotel(index, {
                        stayType: e.target.value as HotelRow["stayType"],
                      })
                    }
                  >
                    <option value="CORE">Core Tour Hotel</option>
                    <option value="PRE">Pre-Stay Add-On</option>
                    <option value="POST">Post-Stay Add-On</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Hotel Name
                  </span>
                  <input
                    className="w-full rounded-md border p-2"
                    value={row.hotelName}
                    onChange={(e) =>
                      onUpdateHotel(index, { hotelName: e.target.value })
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Destination / City
                  </span>
                  <input
                    className="w-full rounded-md border p-2"
                    value={row.destination}
                    onChange={(e) =>
                      onUpdateHotel(index, { destination: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Nights</span>
                  <input
                    type="number"
                    className="w-full rounded-md border p-2"
                    value={row.nights}
                    onChange={(e) =>
                      onUpdateHotel(index, { nights: toNumber(e.target.value) })
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Single / Person / Night
                  </span>
                  <input
                    type="number"
                    className="w-full rounded-md border p-2"
                    value={row.singlePerPerson}
                    onChange={(e) =>
                      onUpdateHotel(index, {
                        singlePerPerson: toNumber(e.target.value),
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
                    className="w-full rounded-md border p-2"
                    value={row.doubleTwinPerPerson}
                    onChange={(e) =>
                      onUpdateHotel(index, {
                        doubleTwinPerPerson: toNumber(e.target.value),
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
                    className="w-full rounded-md border p-2"
                    value={row.triplePerPerson}
                    onChange={(e) =>
                      onUpdateHotel(index, {
                        triplePerPerson: toNumber(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">Single Hotel Cost / Person</div>
                  <div className="font-semibold">
                    {formatMoney(singleTotal, currency)}
                  </div>
                </div>

                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">
                    Double/Twin Hotel Cost / Person
                  </div>
                  <div className="font-semibold">
                    {formatMoney(doubleTwinTotal, currency)}
                  </div>
                </div>

                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="text-slate-500">Triple Hotel Cost / Person</div>
                  <div className="font-semibold">
                    {formatMoney(tripleTotal, currency)}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onRemoveHotel(index)}
                    disabled={hotels.length === 1}
                    className="w-full rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
