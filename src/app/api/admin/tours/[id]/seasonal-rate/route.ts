import { NextResponse } from "next/server";
import { Season } from "@prisma/client";

import { db } from "@/lib/db";

const VALID_SEASONS: Season[] = [
  "LOW",
  "SHOULDER",
  "HIGH",
  "PEAK",
];

function parseDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T12:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isSeason(value: string | null): value is Season {
  return (
    value !== null &&
    VALID_SEASONS.includes(value as Season)
  );
}

function getDayRange(date: Date) {
  const start = new Date(date);

  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
  };
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const url = new URL(request.url);

    const startDate = parseDate(
      url.searchParams.get("startDate")
    );

    const endDate = parseDate(
      url.searchParams.get("endDate")
    );

    const requestedSeason =
      url.searchParams.get("season");

    /*
     * We support two ways of identifying the season:
     *
     * 1. Explicit:
     *    ?season=HIGH
     *
     * 2. From an existing DepartureDate:
     *    ?startDate=2026-09-15
     *
     * The second method lets the Quote module continue
     * working with the existing tour departure structure.
     */

    let season: Season | null =
      isSeason(requestedSeason)
        ? requestedSeason
        : null;

    if (!season && startDate) {
      const dayRange = getDayRange(startDate);

      const departure =
        await db.departureDate.findFirst({
          where: {
            tourId: id,

            date: {
              gte: dayRange.start,
              lt: dayRange.end,
            },
          },

          select: {
            season: true,
          },

          orderBy: {
            date: "asc",
          },
        });

      season = departure?.season ?? null;
    }

    const tour = await db.tour.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        title: true,

        pricingTiers: {
          where: {
            isActive: true,
          },

          select: {
            pricePerPerson: true,
            currency: true,
            minPax: true,
          },

          orderBy: [
            {
              pricePerPerson: "asc",
            },
          ],
        },

        seasonalPrices: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            season: true,
            price: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!tour) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tour not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Currency is no longer stored directly on Tour.
     * It belongs to PricingTier.
     *
     * EUR is our safe platform fallback when no pricing
     * tier exists yet.
     */

    const referenceTier =
      tour.pricingTiers[0] ?? null;

    const currency =
      referenceTier?.currency ?? "EUR";

    const startingPrice =
      referenceTier?.pricePerPerson ?? null;

    /*
     * If we cannot determine a season from either an
     * explicit season parameter or a matching departure,
     * we return the tour information but no seasonal rate.
     *
     * We do NOT guess the season from the calendar month.
     */

    if (!season) {
      return NextResponse.json({
        ok: true,

        tour: {
          id: tour.id,
          title: tour.title,
          startingPrice,
          currency,
        },

        rate: null,

        message:
          "No season could be determined for the requested date.",
      });
    }

    const seasonalRate =
      tour.seasonalPrices.find(
        (rate) => rate.season === season
      ) ?? null;

    if (!seasonalRate) {
      return NextResponse.json({
        ok: true,

        tour: {
          id: tour.id,
          title: tour.title,
          startingPrice,
          currency,
        },

        rate: null,

        season,

        message:
          `No ${season.toLowerCase()} season reference price has been configured for this tour.`,
      });
    }

    /*
     * Transitional response:
     *
     * QuoteCreateForm still expects some fields from the
     * older seasonal-rate architecture.
     *
     * We return those fields as null where appropriate
     * instead of adding obsolete columns back to Prisma.
     *
     * We will clean those old fields from QuoteCreateForm
     * when we reach the Quote module.
     */

    return NextResponse.json({
      ok: true,

      tour: {
        id: tour.id,
        title: tour.title,
        startingPrice,
        currency,
      },

      rate: {
        id: seasonalRate.id,

        season: seasonalRate.season,

        price: seasonalRate.price,

        currency,

        /*
         * Legacy compatibility fields.
         *
         * These are intentionally NOT stored in
         * TourSeasonalPrice anymore.
         */

        validFrom: startDate
          ? startDate.toISOString()
          : null,

        validTo: endDate
          ? endDate.toISOString()
          : startDate
            ? startDate.toISOString()
            : null,

        singleSupplement: null,

        tripleReduction: null,

        minPax: null,

        notes: null,
      },
    });
  } catch (error) {
    console.error(
      "Failed to load seasonal tour rate:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to load seasonal reference rate.",
      },
      {
        status: 500,
      }
    );
  }
}