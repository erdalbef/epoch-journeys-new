import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import TourForm from "@/components/admin/TourForm";
import { PricingType, Season } from "@prisma/client";

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

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
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
  minPax: number;
  maxPax: number;
  roomType: "SINGLE" | "DOUBLE_TWIN" | "TRIPLE";
  price: number;
};

function parsePricingTiers(value: FormDataEntryValue | null): TierInput[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (
          typeof item !== "object" ||
          item === null ||
          !("minPax" in item) ||
          !("maxPax" in item) ||
          !("roomType" in item) ||
          !("price" in item)
        ) {
          return null;
        }

        const minPax = Number((item as { minPax: unknown }).minPax);
        const maxPax = Number((item as { maxPax: unknown }).maxPax);
        const price = Number((item as { price: unknown }).price);
        const roomType = (item as { roomType: unknown }).roomType;

        if (
          Number.isNaN(minPax) ||
          Number.isNaN(maxPax) ||
          Number.isNaN(price) ||
          minPax < 1 ||
          maxPax < minPax ||
          price < 0 ||
          (roomType !== "SINGLE" &&
            roomType !== "DOUBLE_TWIN" &&
            roomType !== "TRIPLE")
        ) {
          return null;
        }

        return {
          minPax,
          maxPax,
          roomType,
          price,
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
  const basePrice = parseOptionalNumber(formData.get("basePrice"));

  await db.tour.update({
    where: { id },
    data: {
      title,
      category,
      duration,
      pricingType,
      basePrice:
        pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED"
          ? basePrice
          : null,
      destinations: parseCommaSeparated(formData.get("destinations")),
      subcategories: parseCommaSeparated(formData.get("subcategories")),
      tags: parseCommaSeparated(formData.get("tags")),
      highlights: parseCommaSeparated(formData.get("highlights")),
      inclusions: parseCommaSeparated(formData.get("inclusions")),
      exclusions: parseCommaSeparated(formData.get("exclusions")),
      accommodations: parseCommaSeparated(formData.get("accommodations")),
      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
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
        minPax: tier.minPax,
        maxPax: tier.maxPax,
        roomType: tier.roomType,
        price: tier.price,
      })),
    });
  }

  const seasons: Season[] = ["LOW", "SHOULDER", "HIGH", "PEAK"];

  await db.$transaction(async (tx) => {
    for (const season of seasons) {
      const value = formData.get(`seasonPrice_${season}`);
      const price =
        typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : null;

      const existing = await tx.tourSeasonPrice.findUnique({
        where: {
          tourId_season: {
            tourId: id,
            season,
          },
        },
      });

      if (price === null || Number.isNaN(price) || price < 0) {
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
          data: { price },
        });
      } else {
        await tx.tourSeasonPrice.create({
          data: {
            tourId: id,
            season,
            price,
          },
        });
      }
    }
  });

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
      seasonalPrices: true,
    },
  });

  if (!tour) {
    notFound();
  }

  const seasonalMap: Record<Season, number | null> = {
    LOW: null,
    SHOULDER: null,
    HIGH: null,
    PEAK: null,
  };

  for (const sp of tour.seasonalPrices) {
    seasonalMap[sp.season] = sp.price;
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
          basePrice: tour.basePrice != null ? Number(tour.basePrice) : null,
          pricingTiers: tour.pricingTiers.map((t) => ({
            minPax: Number(t.minPax),
            maxPax: Number(t.maxPax),
            roomType: t.roomType,
            price: Number(t.price),
          })),
        }}
        seasonalPrices={seasonalMap}
      />
    </div>
  );
}