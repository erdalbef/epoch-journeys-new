import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import PrivateGroupPricingManager from "@/components/admin/tours/PrivateGroupPricingManager";

const planSelect = {
  id: true,
  year: true,
  currency: true,
  title: true,
  description: true,
  isActive: true,
  minPayingPax: true,
  maxPayingPax: true,
  focEnabled: true,
  focPayingPaxRatio: true,
  focNotes: true,
  packageIncludes: true,
  packageExcludes: true,
  pricingNotes: true,
  seasons: {
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
      season: true,
      months: true,
      seasonNote: true,
      singleSupplement: true,
      tripleReduction: true,
      isOnRequest: true,
      notes: true,
      sortOrder: true,
      priceBands: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            minPayingPax: "asc",
          },
        ],
        select: {
          id: true,
          minPayingPax: true,
          maxPayingPax: true,
          doubleTwinPrice: true,
          isActive: true,
          sortOrder: true,
          notes: true,
        },
      },
    },
  },
} satisfies Prisma.PrivateGroupPricingPlanSelect;

type Plan = Prisma.PrivateGroupPricingPlanGetPayload<{
  select: typeof planSelect;
}>;

function serializePlan(plan: Plan) {
  return {
    ...plan,
    seasons: plan.seasons.map((season) => ({
      ...season,
      singleSupplement:
        season.singleSupplement === null
          ? null
          : Number(season.singleSupplement),
      tripleReduction:
        season.tripleReduction === null
          ? null
          : Number(season.tripleReduction),
      priceBands: season.priceBands.map((band) => ({
        ...band,
        doubleTwinPrice: Number(band.doubleTwinPrice),
      })),
    })),
  };
}

export default async function PrivateGroupPricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      category: true,
      currency: true,
      inclusions: true,
      exclusions: true,
      privateGroupPricingPlans: {
        orderBy: {
          year: "desc",
        },
        select: planSelect,
      },
    },
  });

  if (!tour) {
    notFound();
  }

  const plans = tour.privateGroupPricingPlans.map(serializePlan);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Admin · Tours · Private Group Pricing
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {tour.title}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage annual NET B2B prices for standard partner-organized groups.
            Prices are based on paying passengers and Double/Twin sharing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/tours/${tour.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#001F3F] hover:text-[#001F3F]"
          >
            Tour Details
          </Link>

          <Link
            href="/admin/tours"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#001F3F] hover:text-[#001F3F]"
          >
            All Tours
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
        <strong>Epoch Group Policy:</strong> Private-group prices are NET B2B
        rates for the standard published package. The normal complimentary rule
        is <strong>1 FOC for EVERY 10 paying passengers</strong>. Partners choose
        their preferred travel dates; final season, availability and price remain
        subject to Epoch Journeys confirmation.
      </div>

      <PrivateGroupPricingManager
        tourId={tour.id}
        defaultCurrency={tour.currency || "EUR"}
        defaultIncludes={tour.inclusions}
        defaultExcludes={tour.exclusions}
        initialPlans={plans}
      />
    </div>
  );
}
