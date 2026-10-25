"use client";

/**
 * The old "totalPassengers" property means PAYING pilgrims in the
 * existing quotation model. Preserve this shape for saved quote compatibility.
 * Complimentary counts are displayed/edited only in
 * ComplimentaryTravelersSection, which is the authoritative input.
 */
type GroupSetup = {
  totalPassengers: number;
  freePassengers: number;
  startDate: string;
  endDate: string;
};

type Props = {
  group: GroupSetup;
  payingPassengers: number; // Retained for backward-compatible parent props.
  onUpdateGroup: (patch: Partial<GroupSetup>) => void;
  toNumber: (value: unknown) => number;
};

export default function GroupSetupSection({
  group,
  onUpdateGroup,
  toNumber,
}: Props) {
  const payingPilgrims = Math.max(Math.floor(toNumber(group.totalPassengers)), 0);

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">3. Group Setup</h2>
        <p className="mt-1 text-sm text-blue-100">
          Define paying pilgrims and travel dates. Complimentary travelers
          are configured in the following section.
        </p>
      </div>

      <div className="space-y-6 p-5">
        <div>
          <h3 className="font-semibold text-[#001F3F]">Paying Group</h3>
          <p className="mt-1 text-sm text-slate-600">
            The paying count determines group-cost allocation and pricing tiers.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Paying Pilgrims
              </span>
              <input
                type="number"
                min="1"
                step="1"
                className="w-full rounded-md border p-2"
                value={payingPilgrims}
                onChange={(e) =>
                  onUpdateGroup({
                    totalPassengers: Math.max(Math.floor(toNumber(e.target.value)), 1),
                  })
                }
              />
              <span className="mt-1 block text-xs text-slate-500">
                Applies to current pricing and the 20 / 25 / 30 / 35 / 40-payer tiers.
              </span>
            </label>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>Complimentary travelers are not fixed.</strong>
              <p className="mt-1">
                Choose Automatic or Manual, specify the priest and group leader,
                and review the full traveler count in the next section.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-semibold text-[#001F3F]">Requested Travel Dates</h3>
          <p className="mt-1 text-sm text-slate-600">
            Used to determine seasonal reference rates and supplier costing.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Start Date</span>
              <input
                type="date"
                className="w-full rounded-md border p-2"
                value={group.startDate}
                onChange={(e) => onUpdateGroup({ startDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">End Date</span>
              <input
                type="date"
                className="w-full rounded-md border p-2"
                value={group.endDate}
                min={group.startDate || undefined}
                onChange={(e) => onUpdateGroup({ endDate: e.target.value })}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
