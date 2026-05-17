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
  onAddHotel: () => void;
  onRemoveHotel: (index: number) => void;
  onUpdateHotel: (index: number, patch: Partial<HotelRow>) => void;
  toNumber: (value: unknown) => number;
};

export default function HotelsSection({
  hotels,
  onAddHotel,
  onRemoveHotel,
  onUpdateHotel,
  toNumber,
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#001F3F] text-white px-5 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Hotels</h2>

        <button
          type="button"
          onClick={onAddHotel}
          className="bg-white text-[#001F3F] px-3 py-1.5 rounded-md text-sm font-medium"
        >
          Add Hotel
        </button>
      </div>

      <div className="p-5 space-y-4">
        {hotels.map((row, index) => (
          <div key={index} className="rounded-lg border p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <label>
                <span className="text-sm font-medium">Hotel Name</span>
                <input
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.hotelName}
                  onChange={(e) =>
                    onUpdateHotel(index, { hotelName: e.target.value })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-medium">Destination / City</span>
                <input
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.destination}
                  onChange={(e) =>
                    onUpdateHotel(index, { destination: e.target.value })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-medium">Stay Type</span>
                <select
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.stayType}
                  onChange={(e) =>
                    onUpdateHotel(index, {
                      stayType: e.target.value as "CORE" | "PRE" | "POST",
                    })
                  }
                >
                  <option value="CORE">Core Tour Stay</option>
                  <option value="PRE">Pre Night</option>
                  <option value="POST">Post Night</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <label>
                <span className="text-sm font-medium">Nights</span>
                <input
                  type="number"
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.nights}
                  onChange={(e) =>
                    onUpdateHotel(index, {
                      nights: toNumber(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-medium">Single PP</span>
                <input
                  type="number"
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.singlePerPerson}
                  onChange={(e) =>
                    onUpdateHotel(index, {
                      singlePerPerson: toNumber(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-medium">Double / Twin PP</span>
                <input
                  type="number"
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.doubleTwinPerPerson}
                  onChange={(e) =>
                    onUpdateHotel(index, {
                      doubleTwinPerPerson: toNumber(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-medium">Triple PP</span>
                <input
                  type="number"
                  className="w-full rounded-md border p-2 mt-1"
                  value={row.triplePerPerson}
                  onChange={(e) =>
                    onUpdateHotel(index, {
                      triplePerPerson: toNumber(e.target.value),
                    })
                  }
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onRemoveHotel(index)}
                  disabled={hotels.length === 1}
                  className="w-full border px-3 py-2 rounded-md text-sm text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {row.stayType === "CORE" &&
                "Included in the main tour hotel package calculation."}
              {row.stayType === "PRE" &&
                "Handled as a pre-tour stay and should be summarized separately from the core package."}
              {row.stayType === "POST" &&
                "Handled as a post-tour stay and should be summarized separately from the core package."}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}