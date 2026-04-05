import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Season } from "@prisma/client";

import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSeasonLabel(season: Season) {
  switch (season) {
    case "LOW":
      return "Low Season";
    case "SHOULDER":
      return "Shoulder Season";
    case "HIGH":
      return "High Season";
    case "PEAK":
      return "Peak Season";
    default:
      return season;
  }
}

function parsePrice(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return parsed;
}

async function saveSeasonalPrices(tourId: string, formData: FormData) {
  "use server";

  const lowPrice = parsePrice(formData.get("LOW"));
  const shoulderPrice = parsePrice(formData.get("SHOULDER"));
  const highPrice = parsePrice(formData.get("HIGH"));
  const peakPrice = parsePrice(formData.get("PEAK"));

  const entries: Array<{ season: Season; price: number | null }> = [
    { season: "LOW", price: lowPrice },
    { season: "SHOULDER", price: shoulderPrice },
    { season: "HIGH", price: highPrice },
    { season: "PEAK", price: peakPrice },
  ];

  await db.$transaction(async (tx) => {
    for (const entry of entries) {
      const existing = await tx.tourSeasonPrice.findUnique({
        where: {
          tourId_season: {
            tourId,
            season: entry.season,
          },
        },
        select: {
          id: true,
        },
      });

      if (entry.price === null) {
        if (existing) {
          await tx.tourSeasonPrice.delete({
            where: { id: existing.id },
          });
        }
        continue;
      }

      if (existing) {
        await tx.tourSeasonPrice.update({
          where: { id: existing.id },
          data: { price: entry.price },
        });
      } else {
        await tx.tourSeasonPrice.create({
          data: {
            tourId,
            season: entry.season,
            price: entry.price,
          },
        });
      }
    }
  });

  redirect(`/admin/tours/${tourId}/seasonal-prices?success=saved`);
}

export default async function AdminTourSeasonalPricesPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { success } = await searchParams;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      seasonalPrices: {
        orderBy: {
          season: "asc",
        },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  const seasonalPriceMap: Record<Season, number | ""> = {
    LOW: "",
    SHOULDER: "",
    HIGH: "",
    PEAK: "",
  };

  for (const item of tour.seasonalPrices) {
    seasonalPriceMap[item.season] = item.price;
  }

  const orderedSeasons: Season[] = ["LOW", "SHOULDER", "HIGH", "PEAK"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seasonal Prices</h1>
          <p className="text-sm text-muted-foreground">
            {tour.title} — define default prices by season.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/tours/${tour.id}/departures`}
            className="text-sm underline underline-offset-4"
          >
            Manage Departures
          </Link>

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

      {success === "saved" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Seasonal prices saved successfully.
        </div>
      )}

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Default Seasonal Pricing</h2>
          <p className="text-sm text-muted-foreground">
            These prices can be used to auto-fill departure prices when a season
            is selected. Leave a field empty if you do not want a default for
            that season.
          </p>
        </div>

        <form action={saveSeasonalPrices.bind(null, tour.id)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {orderedSeasons.map((season) => (
              <div key={season}>
                <label
                  htmlFor={season}
                  className="text-sm font-medium"
                >
                  {getSeasonLabel(season)}
                </label>

                <input
                  id={season}
                  name={season}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={seasonalPriceMap[season]}
                  className="mt-1 w-full rounded border p-2"
                />

                <p className="mt-1 text-xs text-gray-500">
                  {seasonalPriceMap[season] === ""
                    ? "No default price set"
                    : `Current default: ${formatCurrency(
                        Number(seasonalPriceMap[season])
                      )}`}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
            >
              Save Seasonal Prices
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Current Seasonal Prices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of saved default prices for this tour.
        </p>

        <div className="mt-4 space-y-3">
          {tour.seasonalPrices.length === 0 ? (
            <div className="rounded border bg-gray-50 p-4 text-sm text-gray-600">
              No seasonal prices saved yet.
            </div>
          ) : (
            tour.seasonalPrices.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded border p-4"
              >
                <div>
                  <p className="font-medium">{getSeasonLabel(item.season)}</p>
                  <p className="text-sm text-muted-foreground">
                    Default price for this season
                  </p>
                </div>

                <div className="text-sm font-semibold">
                  {formatCurrency(item.price)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}