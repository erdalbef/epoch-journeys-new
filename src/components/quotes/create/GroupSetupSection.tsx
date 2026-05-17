"use client";

type GroupSetup = {
  totalPassengers: number;
  freePassengers: number;
  startDate: string;
  endDate: string;
};

type Props = {
  group: GroupSetup;
  payingPassengers: number;
  onUpdateGroup: (patch: Partial<GroupSetup>) => void;
  toNumber: (value: unknown) => number;
};

export default function GroupSetupSection({
  group,
  payingPassengers,
  onUpdateGroup,
  toNumber,
}: Props) {
  return (
    <section className="rounded-xl border overflow-hidden">
      <div className="bg-[#001F3F] text-white px-5 py-3">
        <h2 className="text-lg font-semibold">Group Setup</h2>
      </div>

      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Base Passenger Count
            </span>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={group.totalPassengers}
              onChange={(e) =>
                onUpdateGroup({
                  totalPassengers: toNumber(e.target.value),
                })
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Free Passengers
            </span>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={group.freePassengers}
              onChange={(e) =>
                onUpdateGroup({
                  freePassengers: toNumber(e.target.value),
                })
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Start Date</span>
            <input
              type="date"
              className="w-full rounded-md border p-2"
              value={group.startDate}
              onChange={(e) =>
                onUpdateGroup({
                  startDate: e.target.value,
                })
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">End Date</span>
            <input
              type="date"
              className="w-full rounded-md border p-2"
              value={group.endDate}
              onChange={(e) =>
                onUpdateGroup({
                  endDate: e.target.value,
                })
              }
            />
          </label>

          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-700">Paying Passengers</div>
            <div className="mt-1 text-lg font-semibold">{payingPassengers}</div>
            <div className="text-xs text-slate-500">
              Calculated automatically
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}