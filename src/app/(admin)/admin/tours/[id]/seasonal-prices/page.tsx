import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Season } from "@prisma/client";

import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const orderedSeasons: Season[] = [
  "LOW",
  "SHOULDER",
  "HIGH",
  "PEAK",
];

function getSeasonLabel(season: Season) {
  return `${season.charAt(0)}${season
    .slice(1)
    .toLowerCase()} Season`;
}

function getSeasonDescription(season: Season) {
  switch (season) {
    case "LOW":
      return "Lowest-demand travel periods and the most economical planning baseline.";

    case "SHOULDER":
      return "Moderate-demand periods between low and high season.";

    case "HIGH":
      return "Popular travel periods with stronger hotel and supplier demand.";

    case "PEAK":
      return "Highest-demand periods, major holidays, religious events, or exceptional dates.";
  }
}

function parseRequiredPrice(
  value: FormDataEntryValue | null
): number | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : null;
}

function parseOptionalDate(
  value: FormDataEntryValue | null
): Date | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function formatMoney(
  value: number,
  currency = "EUR"
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

async function saveSeasonalPrice(
  tourId: string,
  formData: FormData
) {
  "use server";

  const seasonRaw = formData
    .get("season")
    ?.toString();

  const price = parseRequiredPrice(
    formData.get("price")
  );

  const validFrom = parseOptionalDate(
    formData.get("validFrom")
  );

  const validTo = parseOptionalDate(
    formData.get("validTo")
  );

  if (
    !seasonRaw ||
    !orderedSeasons.includes(
      seasonRaw as Season
    ) ||
    price === null
  ) {
    redirect(
      `/admin/tours/${tourId}/seasonal-prices?error=invalid`
    );
  }

  if (
    validFrom &&
    validTo &&
    validTo < validFrom
  ) {
    redirect(
      `/admin/tours/${tourId}/seasonal-prices?error=date-range`
    );
  }

  const season = seasonRaw as Season;

  await db.tourSeasonalPrice.create({
    data: {
      tourId,
      season,
      price,
      validFrom,
      validTo,
      currency: "EUR",
    },
  });

  redirect(
    `/admin/tours/${tourId}/seasonal-prices?success=saved`
  );
}

async function deleteSeasonalPrice(
  tourId: string,
  rateId: string
) {
  "use server";

  await db.tourSeasonalPrice.deleteMany({
    where: {
      id: rateId,
      tourId,
    },
  });

  redirect(
    `/admin/tours/${tourId}/seasonal-prices?success=deleted`
  );
}

export default async function AdminTourSeasonalPricesPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { success, error } =
    await searchParams;

  const tour = await db.tour.findUnique({
    where: {
      id,
    },

    include: {
      seasonalPrices: {
        orderBy: [
          {
            validFrom: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
    },
  });

  if (!tour) {
    notFound();
  }

  const seasonalPrices = [
    ...tour.seasonalPrices,
  ].sort((a, b) => {
    const seasonDifference =
      orderedSeasons.indexOf(a.season) -
      orderedSeasons.indexOf(b.season);

    if (seasonDifference !== 0) {
      return seasonDifference;
    }

    if (!a.validFrom && !b.validFrom) {
      return 0;
    }

    if (!a.validFrom) {
      return 1;
    }

    if (!b.validFrom) {
      return -1;
    }

    return (
      a.validFrom.getTime() -
      b.validFrom.getTime()
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Seasonal Quote Rates
          </h1>

          <p className="text-sm text-muted-foreground">
            {tour.title} — internal seasonal
            pricing guidance used when preparing
            requested-date group quotations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/tours/${tour.id}/edit`}
            className="text-sm underline underline-offset-4"
          >
            Edit Tour
          </Link>

          <Link
            href="/admin/tours"
            className="text-sm underline underline-offset-4"
          >
            Back to Tours
          </Link>
        </div>
      </div>

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success === "deleted"
            ? "Seasonal rate deleted successfully."
            : "Seasonal rate saved successfully."}
        </div>
      )}

      {error === "invalid" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Please select a valid season and enter
          a valid reference price.
        </div>
      )}

      {error === "date-range" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          The end date cannot be earlier than
          the start date.
        </div>
      )}

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Add Seasonal Rate Period
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Add an internal starting-rate
            reference for a particular travel
            period.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            More than one rate may exist within
            the same season. This allows quotation
            pricing to reflect specific requested
            travel dates rather than assuming one
            fixed price for the entire season.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            These rates are internal quotation
            guidance only. The final NET group
            price is calculated and confirmed in
            the Quote module according to the
            requested dates, group size, room
            configuration, and current supplier
            costs.
          </p>
        </div>

        <form
          action={saveSeasonalPrice.bind(
            null,
            tour.id
          )}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="season"
                className="text-sm font-medium"
              >
                Season
              </label>

              <select
                id="season"
                name="season"
                required
                className="mt-1 w-full rounded border p-2"
              >
                {orderedSeasons.map(
                  (season) => (
                    <option
                      key={season}
                      value={season}
                    >
                      {getSeasonLabel(
                        season
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="validFrom"
                className="text-sm font-medium"
              >
                Valid From
              </label>

              <input
                id="validFrom"
                name="validFrom"
                type="date"
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label
                htmlFor="validTo"
                className="text-sm font-medium"
              >
                Valid To
              </label>

              <input
                id="validTo"
                name="validTo"
                type="date"
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="text-sm font-medium"
              >
                Starting Reference Rate
              </label>

              <div className="mt-1 flex">
                <span className="flex items-center rounded-l border border-r-0 bg-gray-50 px-3 text-sm text-gray-600">
                  EUR
                </span>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-r border p-2"
                  placeholder="1850"
                />
              </div>
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            Leave the dates empty only when the
            rate is intended as a general
            seasonal reference rather than a
            specific travel period.
          </div>

          <button
            type="submit"
            className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
          >
            Add Seasonal Rate
          </button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Seasonal Pricing Overview
          </h2>

          <p className="text-sm text-muted-foreground">
            Epoch Journeys uses four seasonal
            reference levels while allowing
            multiple date periods inside each
            season.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {orderedSeasons.map((season) => {
            const seasonRates =
              seasonalPrices.filter(
                (item) =>
                  item.season === season
              );

            const lowestRate =
              seasonRates.length > 0
                ? Math.min(
                    ...seasonRates.map(
                      (rate) => rate.price
                    )
                  )
                : null;

            return (
              <div
                key={season}
                className="rounded-lg border p-4"
              >
                <h3 className="font-semibold">
                  {getSeasonLabel(season)}
                </h3>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {getSeasonDescription(season)}
                </p>

                <div className="mt-5">
                  {lowestRate !== null ? (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Starting from
                      </p>

                      <p className="mt-1 text-2xl font-bold text-[#0B1F3A]">
                        {formatMoney(
                          lowestRate,
                          "EUR"
                        )}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {seasonRates.length} saved{" "}
                        {seasonRates.length === 1
                          ? "period"
                          : "periods"}
                      </p>
                    </>
                  ) : (
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm text-gray-500">
                        No rate set
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {seasonalPrices.length > 0 && (
        <section className="rounded-lg border bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Saved Seasonal Rate Periods
            </h2>

            <p className="text-sm text-muted-foreground">
              Internal requested-date pricing
              references currently stored for
              this tour.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">
                    Season
                  </th>

                  <th className="p-3">
                    Valid From
                  </th>

                  <th className="p-3">
                    Valid To
                  </th>

                  <th className="p-3">
                    Starting Rate
                  </th>

                  <th className="p-3">
                    Last Updated
                  </th>

                  <th className="p-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {seasonalPrices.map(
                  (rate) => (
                    <tr
                      key={rate.id}
                      className="border-b"
                    >
                      <td className="p-3 font-medium">
                        {getSeasonLabel(
                          rate.season
                        )}
                      </td>

                      <td className="p-3">
                        {formatDate(
                          rate.validFrom
                        )}
                      </td>

                      <td className="p-3">
                        {formatDate(
                          rate.validTo
                        )}
                      </td>

                      <td className="p-3 font-semibold">
                        {formatMoney(
                          rate.price,
                          rate.currency
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground">
                        {new Intl.DateTimeFormat(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        ).format(
                          rate.updatedAt
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <form
                          action={deleteSeasonalPrice.bind(
                            null,
                            tour.id,
                            rate.id
                          )}
                        >
                          <button
                            type="submit"
                            className="text-red-700 underline underline-offset-4"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}