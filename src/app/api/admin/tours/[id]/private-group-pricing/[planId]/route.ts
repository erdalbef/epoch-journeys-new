import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role, Season } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
    planId: string;
  }>;
};

type Body = {
  year?: string;
  currency?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
  minPayingPax?: string;
  maxPayingPax?: string;
  focEnabled?: boolean;
  focPayingPaxRatio?: string;
  focNotes?: string;
  packageIncludes?: string;
  packageExcludes?: string;
  pricingNotes?: string;
  seasons?: SeasonBody[];
};

type SeasonBody = {
  season?: string;
  months?: number[];
  seasonNote?: string;
  singleSupplement?: string;
  tripleReduction?: string;
  isOnRequest?: boolean;
  notes?: string;
  priceBands?: BandBody[];
};

type BandBody = {
  minPayingPax?: string;
  maxPayingPax?: string;
  doubleTwinPrice?: string;
  notes?: string;
};

function clean(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function lines(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalInt(value: unknown) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function requiredInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function optionalDecimal(value: unknown) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? new Prisma.Decimal(parsed)
    : null;
}

function requiredDecimal(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? new Prisma.Decimal(parsed)
    : null;
}

function parseSeason(value: unknown): Season | null {
  switch (value) {
    case Season.LOW:
      return Season.LOW;
    case Season.SHOULDER:
      return Season.SHOULDER;
    case Season.HIGH:
      return Season.HIGH;
    case Season.PEAK:
      return Season.PEAK;
    default:
      return null;
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return null;
  }

  return session.user;
}

function buildSeasons(seasons: SeasonBody[]) {
  const seasonCreates: Prisma.PrivateGroupSeasonCreateWithoutPricingPlanInput[] =
    [];

  for (let seasonIndex = 0; seasonIndex < seasons.length; seasonIndex += 1) {
    const seasonInput = seasons[seasonIndex];
    const season = parseSeason(seasonInput.season);

    if (!season) {
      throw new Error(`Season ${seasonIndex + 1} is invalid.`);
    }

    const months = Array.isArray(seasonInput.months)
      ? seasonInput.months.filter(
          (month) => Number.isInteger(month) && month >= 1 && month <= 12,
        )
      : [];

    if (months.length === 0) {
      throw new Error(`Season ${seasonIndex + 1} needs at least one month.`);
    }

    const isOnRequest = Boolean(seasonInput.isOnRequest);
    const bands = Array.isArray(seasonInput.priceBands)
      ? seasonInput.priceBands
      : [];

    if (!isOnRequest && bands.length === 0) {
      throw new Error(`Season ${seasonIndex + 1} needs a price band.`);
    }

    const bandCreates: Prisma.PrivateGroupPriceBandCreateWithoutSeasonInput[] =
      [];

    for (let bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
      const bandInput = bands[bandIndex];
      const minPax = requiredInt(bandInput.minPayingPax);
      const maxPax = optionalInt(bandInput.maxPayingPax);
      const price = requiredDecimal(bandInput.doubleTwinPrice);

      if (
        !Number.isInteger(minPax) ||
        minPax < 1 ||
        Number.isNaN(maxPax) ||
        (maxPax !== null && maxPax < minPax) ||
        (!isOnRequest && (!price || price.lte(0)))
      ) {
        throw new Error(
          `Season ${seasonIndex + 1}, price band ${bandIndex + 1} is invalid.`,
        );
      }

      bandCreates.push({
        minPayingPax: minPax,
        maxPayingPax: maxPax,
        doubleTwinPrice: price ?? new Prisma.Decimal(0),
        isActive: true,
        sortOrder: bandIndex,
        notes: clean(bandInput.notes),
      });
    }

    seasonCreates.push({
      season,
      months,
      seasonNote: clean(seasonInput.seasonNote),
      singleSupplement: optionalDecimal(seasonInput.singleSupplement),
      tripleReduction: optionalDecimal(seasonInput.tripleReduction),
      isOnRequest,
      notes: clean(seasonInput.notes),
      sortOrder: seasonIndex,
      priceBands: {
        create: bandCreates,
      },
    });
  }

  return seasonCreates;
}

export async function PUT(request: Request, context: Context) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: tourId, planId } = await context.params;
    const body = (await request.json()) as Body;

    const existing = await db.privateGroupPricingPlan.findFirst({
      where: {
        id: planId,
        tourId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pricing plan not found." },
        { status: 404 },
      );
    }

    const year = requiredInt(body.year);
    const minPayingPax = optionalInt(body.minPayingPax);
    const maxPayingPax = optionalInt(body.maxPayingPax);
    const focPayingPaxRatio = requiredInt(body.focPayingPaxRatio ?? "10");

    if (
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2200 ||
      Number.isNaN(minPayingPax) ||
      Number.isNaN(maxPayingPax) ||
      !Number.isInteger(focPayingPaxRatio) ||
      focPayingPaxRatio < 1
    ) {
      return NextResponse.json(
        { error: "One or more pricing fields are invalid." },
        { status: 400 },
      );
    }

    const conflictingPlan = await db.privateGroupPricingPlan.findFirst({
      where: {
        tourId,
        year,
        NOT: {
          id: planId,
        },
      },
      select: {
        id: true,
      },
    });

    if (conflictingPlan) {
      return NextResponse.json(
        { error: `Another pricing plan for ${year} already exists.` },
        { status: 409 },
      );
    }

    const seasons = Array.isArray(body.seasons) ? body.seasons : [];

    if (seasons.length === 0) {
      return NextResponse.json(
        { error: "Add at least one pricing season." },
        { status: 400 },
      );
    }

    const seasonCreates = buildSeasons(seasons);

    await db.$transaction(async (tx) => {
      await tx.privateGroupSeason.deleteMany({
        where: {
          pricingPlanId: planId,
        },
      });

      await tx.privateGroupPricingPlan.update({
        where: {
          id: planId,
        },
        data: {
          year,
          currency: clean(body.currency)?.toUpperCase() || "EUR",
          title: clean(body.title),
          description: clean(body.description),
          isActive: body.isActive !== false,
          minPayingPax,
          maxPayingPax,
          focEnabled: body.focEnabled !== false,
          focPayingPaxRatio,
          focNotes: clean(body.focNotes),
          packageIncludes: lines(body.packageIncludes),
          packageExcludes: lines(body.packageExcludes),
          pricingNotes: clean(body.pricingNotes),
          seasons: {
            create: seasonCreates,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("UPDATE_PRIVATE_GROUP_PRICING_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update private-group pricing.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: tourId, planId } = await context.params;

    const existing = await db.privateGroupPricingPlan.findFirst({
      where: {
        id: planId,
        tourId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pricing plan not found." },
        { status: 404 },
      );
    }

    await db.privateGroupPricingPlan.delete({
      where: {
        id: planId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE_PRIVATE_GROUP_PRICING_ERROR", error);

    return NextResponse.json(
      { error: "Failed to delete private-group pricing." },
      { status: 500 },
    );
  }
}
