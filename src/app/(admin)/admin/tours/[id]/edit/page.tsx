import { PricingType } from "@prisma/client";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import TourForm from "@/components/admin/TourForm";

function parseCommaSeparated(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isPricingType(value: string): value is PricingType {
  return (
    value === "FIXED_GROUP" ||
    value === "GROUP_BASED" ||
    value === "FIT_DYNAMIC" ||
    value === "FIT_FIXED" ||
    value === "FIT_TIERED"
  );
}

type TierInput = {
  label: string | null;
  minPax: number | null;
  maxPax: number | null;
  roomType: "SINGLE" | "DOUBLE_TWIN" | "TRIPLE" | null;
  pricePerPerson: number;
  currency: string;
  isActive: boolean;
};

function parsePricingTiers(value: FormDataEntryValue | null): TierInput[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return null;
        }

        const tier = item as {
          label?: unknown;
          minPax?: unknown;
          maxPax?: unknown;
          roomType?: unknown;
          pricePerPerson?: unknown;
          currency?: unknown;
          isActive?: unknown;
        };

        const pricePerPerson = Number(tier.pricePerPerson);

        if (Number.isNaN(pricePerPerson) || pricePerPerson <= 0) {
          return null;
        }

        const minPax =
          tier.minPax === "" || tier.minPax == null
            ? null
            : Number(tier.minPax);

        const maxPax =
          tier.maxPax === "" || tier.maxPax == null
            ? null
            : Number(tier.maxPax);

        if (minPax !== null && Number.isNaN(minPax)) {
          return null;
        }

        if (maxPax !== null && Number.isNaN(maxPax)) {
          return null;
        }

        if (
          minPax !== null &&
          maxPax !== null &&
          minPax >= 1 &&
          maxPax < minPax
        ) {
          return null;
        }

        const roomType =
          tier.roomType === "SINGLE" ||
          tier.roomType === "DOUBLE_TWIN" ||
          tier.roomType === "TRIPLE"
            ? tier.roomType
            : null;

        return {
          label:
            typeof tier.label === "string" && tier.label.trim()
              ? tier.label.trim()
              : null,
          minPax,
          maxPax,
          roomType,
          pricePerPerson,
          currency:
            typeof tier.currency === "string" && tier.currency.trim()
              ? tier.currency.trim().toUpperCase()
              : "EUR",
          isActive:
            typeof tier.isActive === "boolean" ? tier.isActive : true,
        };
      })
      .filter((item): item is TierInput => item !== null);
  } catch {
    return [];
  }
}

async function updateTour(id: string, formData: FormData) {
  "use server";

  const titleValue = formData.get("title");
  const categoryValue = formData.get("category");
  const durationValue = formData.get("duration");
  const pricingTypeValue = formData.get("pricingType");

  if (
    typeof titleValue !== "string" ||
    typeof categoryValue !== "string" ||
    typeof durationValue !== "string" ||
    typeof pricingTypeValue !== "string"
  ) {
    return;
  }

  const title = titleValue.trim();
  const category = categoryValue.trim();
  const duration = Number(durationValue);
  const pricingType = pricingTypeValue.trim();

  if (
    !title ||
    !category ||
    Number.isNaN(duration) ||
    duration < 1 ||
    !isPricingType(pricingType)
  ) {
    return;
  }

  const pricingTiers = parsePricingTiers(formData.get("pricingTiers"));

  await db.tour.update({
    where: { id },
    data: {
      title,
      category,
      duration,
      pricingType,
      destinations: parseCommaSeparated(formData.get("destinations")),
      subcategories: parseCommaSeparated(formData.get("subcategories")),
      tags: parseCommaSeparated(formData.get("tags")),
      highlights: parseCommaSeparated(formData.get("highlights")),
      inclusions: parseCommaSeparated(formData.get("inclusions")),
      exclusions: parseCommaSeparated(formData.get("exclusions")),
      accommodations: parseCommaSeparated(formData.get("accommodations")),
      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
      whyWeOfferThisTour: parseOptionalString(
        formData.get("whyWeOfferThisTour")
      ),
      tourIntroduction: parseOptionalString(formData.get("tourIntroduction")),
      tourSignificance: parseOptionalString(formData.get("tourSignificance")),
      destinationBriefs: parseOptionalString(formData.get("destinationBriefs")),
      overviewItinerary: parseOptionalString(formData.get("overviewItinerary")),
      itinerary: parseOptionalString(formData.get("itinerary")),
      isPublished: formData.get("isPublished") === "on",
      featured: formData.get("featured") === "on",
      requiresQuote:
        pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC"
          ? true
          : formData.get("requiresQuote") === "on",
    },
  });

  await db.pricingTier.deleteMany({
    where: { tourId: id },
  });

  if (
    (pricingType === "FIT_TIERED" || pricingType === "GROUP_BASED") &&
    pricingTiers.length > 0
  ) {
    await db.pricingTier.createMany({
      data: pricingTiers.map((tier) => ({
        tourId: id,
        label: tier.label,
        minPax: tier.minPax,
        maxPax: tier.maxPax,
        roomType: tier.roomType,
        pricePerPerson: tier.pricePerPerson,
        currency: tier.currency,
        isActive: tier.isActive,
      })),
    });
  }

  redirect("/admin/tours");
}

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      pricingTiers: {
        orderBy: [{ minPax: "asc" }, { maxPax: "asc" }],
      },
      departureDates: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit Tour</h1>

      <TourForm
        mode="edit"
        action={updateTour.bind(null, tour.id)}
        initialValues={{
          title: tour.title ?? "",
          category: tour.category ?? "",
          duration: tour.duration ?? 1,
          shortDescription: tour.shortDescription ?? "",
          destinations: Array.isArray(tour.destinations) ? tour.destinations : [],
          subcategories: Array.isArray(tour.subcategories)
            ? tour.subcategories
            : [],
          tags: Array.isArray(tour.tags) ? tour.tags : [],
          tourIntroduction: tour.tourIntroduction ?? "",
          tourSignificance: tour.tourSignificance ?? "",
          destinationBriefs: tour.destinationBriefs ?? "",
          overview: tour.overview ?? "",
          whyWeOfferThisTour: tour.whyWeOfferThisTour ?? "",
          highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
          inclusions: Array.isArray(tour.inclusions) ? tour.inclusions : [],
          exclusions: Array.isArray(tour.exclusions) ? tour.exclusions : [],
          accommodations: Array.isArray(tour.accommodations)
            ? tour.accommodations
            : [],
          overviewItinerary: tour.overviewItinerary ?? "",
          itinerary: tour.itinerary ?? "",
          isPublished: Boolean(tour.isPublished),
          featured: Boolean(tour.featured),
          requiresQuote: Boolean(tour.requiresQuote),
          pricingType: tour.pricingType,
          pricingTiers: tour.pricingTiers.map((t) => ({
            label: t.label ?? "",
            minPax: t.minPax ?? undefined,
            maxPax: t.maxPax ?? undefined,
            roomType: t.roomType ?? "DOUBLE_TWIN",
            pricePerPerson: t.pricePerPerson,
            currency: t.currency ?? "EUR",
            isActive: t.isActive ?? true,
          })),
        }}
      />
    </div>
  );
}