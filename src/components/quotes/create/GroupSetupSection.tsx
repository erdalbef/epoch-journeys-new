"use client";

type GroupSetup = {
  /**
   * IMPORTANT:
   * For quotation calculations, totalPassengers currently represents
   * PAYING pilgrims.
   *
   * We keep the existing property name temporarily so that we do not
   * break saved quote data or the parent QuoteCreateForm.
   */
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

function calculateRecommendedFreePassengers(
  payingPilgrims: number
): number {
  const paying = Math.max(Math.floor(payingPilgrims), 0);

  // Epoch default:
  // 1 complimentary traveler for every 10 paying pilgrims.
  return Math.floor(paying / 10);
}

export default function GroupSetupSection({
  group,
  onUpdateGroup,
  toNumber,
}: Props) {
  const payingPilgrims = Math.max(
    Math.floor(toNumber(group.totalPassengers)),
    0
  );

  const freePassengers = Math.max(
    Math.floor(toNumber(group.freePassengers)),
    0
  );

  const recommendedFreePassengers =
    calculateRecommendedFreePassengers(payingPilgrims);

  const totalTravelers =
    payingPilgrims + freePassengers;

  const complimentaryMatchesPolicy =
    freePassengers === recommendedFreePassengers;

  function handlePayingPilgrimsChange(value: string) {
    const newPayingPilgrims = Math.max(
      Math.floor(toNumber(value)),
      0
    );

    const newRecommendedFree =
      calculateRecommendedFreePassengers(
        newPayingPilgrims
      );

    onUpdateGroup({
      totalPassengers: newPayingPilgrims,
      freePassengers: newRecommendedFree,
    });
  }

  function handleFreePassengersChange(value: string) {
    const newFreePassengers = Math.max(
      Math.floor(toNumber(value)),
      0
    );

    onUpdateGroup({
      freePassengers: newFreePassengers,
    });
  }

  function applyRecommendedFreePassengers() {
    onUpdateGroup({
      freePassengers: recommendedFreePassengers,
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Header */}
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">
            3. Group Setup
          </h2>

          <p className="text-sm text-blue-100">
            Define the number of paying pilgrims,
            complimentary travelers, and requested travel
            dates.
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* Passenger Setup */}
        <div>
          <div className="mb-4">
            <h3 className="font-semibold text-[#001F3F]">
              Passenger Setup
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Group-size pricing is based on paying pilgrims.
              Complimentary travelers are added to the group
              separately.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Paying Pilgrims */}
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
                  handlePayingPilgrimsChange(
                    e.target.value
                  )
                }
              />

              <span className="mt-1 block text-xs text-slate-500">
                Used for 20 / 25 / 30 / 35 / 40 passenger
                pricing.
              </span>
            </label>

            {/* Complimentary Travelers */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Complimentary Travelers
              </span>

              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-md border p-2"
                value={freePassengers}
                onChange={(e) =>
                  handleFreePassengersChange(
                    e.target.value
                  )
                }
              />

              <span className="mt-1 block text-xs text-slate-500">
                Priest, group leader, or another
                complimentary traveler.
              </span>
            </label>

            {/* Total Travelers */}
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-600">
                Total Travelers
              </div>

              <div className="mt-1 text-2xl font-bold text-[#001F3F]">
                {totalTravelers}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {payingPilgrims} paying +{" "}
                {freePassengers} complimentary
              </div>
            </div>

            {/* Complimentary Policy */}
            <div
              className={`rounded-lg border p-4 ${
                complimentaryMatchesPolicy
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="text-sm font-medium text-slate-700">
                Complimentary Policy
              </div>

              <div className="mt-1 text-lg font-semibold text-[#001F3F]">
                1 Free / 10 Paying
              </div>

              <div className="mt-1 text-xs text-slate-600">
                Recommended for this group:{" "}
                <strong>
                  {recommendedFreePassengers}
                </strong>
              </div>

              {!complimentaryMatchesPolicy && (
                <button
                  type="button"
                  onClick={
                    applyRecommendedFreePassengers
                  }
                  className="mt-3 rounded-md border border-[#8B0000] bg-white px-3 py-1.5 text-xs font-medium text-[#8B0000] transition hover:bg-red-50"
                >
                  Apply Recommended
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Policy Explanation */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="font-medium text-[#001F3F]">
            Epoch Complimentary Policy
          </div>

          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            The standard quotation calculation provides one
            complimentary traveler for every ten paying
            pilgrims. Complimentary travelers are additional
            to the paying group size and their applicable
            costs are distributed across the paying pilgrims.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-blue-200 bg-white px-3 py-1">
              10 paying + 1 free
            </span>

            <span className="rounded-full border border-blue-200 bg-white px-3 py-1">
              20 paying + 2 free
            </span>

            <span className="rounded-full border border-blue-200 bg-white px-3 py-1">
              30 paying + 3 free
            </span>

            <span className="rounded-full border border-blue-200 bg-white px-3 py-1">
              40 paying + 4 free
            </span>
          </div>
        </div>

        {/* Travel Dates */}
        <div className="border-t pt-5">
          <div className="mb-4">
            <h3 className="font-semibold text-[#001F3F]">
              Requested Travel Dates
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              These dates are used to determine the applicable
              seasonal reference rate and supplier costing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Start Date
              </span>

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
              <span className="mb-1 block text-sm font-medium text-slate-700">
                End Date
              </span>

              <input
                type="date"
                className="w-full rounded-md border p-2"
                value={group.endDate}
                min={group.startDate || undefined}
                onChange={(e) =>
                  onUpdateGroup({
                    endDate: e.target.value,
                  })
                }
              />
            </label>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 border-t pt-5 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paying
            </div>

            <div className="mt-1 text-xl font-bold text-[#001F3F]">
              {payingPilgrims}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Complimentary
            </div>

            <div className="mt-1 text-xl font-bold text-[#001F3F]">
              {freePassengers}
            </div>
          </div>

          <div className="rounded-lg bg-[#001F3F] p-4 text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200">
              Total Traveling
            </div>

            <div className="mt-1 text-xl font-bold">
              {totalTravelers}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}