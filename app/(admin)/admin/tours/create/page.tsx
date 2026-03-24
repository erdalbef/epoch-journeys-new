import { PricingType } from "@prisma/client";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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

async function createTour(formData: FormData) {
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

  const destinations = parseCommaSeparated(formData.get("destinations"));
  const subcategories = parseCommaSeparated(formData.get("subcategories"));
  const tags = parseCommaSeparated(formData.get("tags"));
  const highlights = parseCommaSeparated(formData.get("highlights"));
  const inclusions = parseCommaSeparated(formData.get("inclusions"));
  const exclusions = parseCommaSeparated(formData.get("exclusions"));
  const accommodations = parseCommaSeparated(formData.get("accommodations"));

  const basePrice = parseOptionalNumber(formData.get("basePrice"));
  const pricingTiers = parsePricingTiers(formData.get("pricingTiers"));

  const seasonalLow = parseOptionalNumber(formData.get("seasonPrice_LOW"));
  const seasonalShoulder = parseOptionalNumber(
    formData.get("seasonPrice_SHOULDER")
  );
  const seasonalHigh = parseOptionalNumber(formData.get("seasonPrice_HIGH"));
  const seasonalPeak = parseOptionalNumber(formData.get("seasonPrice_PEAK"));

  const usesBasePrice =
    pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED";

  const usesPricingTiers =
    pricingType === "GROUP_BASED" || pricingType === "FIT_TIERED";

  await db.tour.create({
    data: {
      title,
      category,
      subcategories,
      tags,
      destinations,
      duration,

      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
      tourIntroduction: parseOptionalString(formData.get("tourIntroduction")),
      tourSignificance: parseOptionalString(formData.get("tourSignificance")),
      destinationBriefs: parseOptionalString(formData.get("destinationBriefs")),

      pricingType,
      basePrice: usesBasePrice ? basePrice : null,

      pricingTiers:
        usesPricingTiers && pricingTiers.length > 0
          ? {
              create: pricingTiers.map((tier) => ({
                minPax: tier.minPax,
                maxPax: tier.maxPax,
                roomType: tier.roomType,
                price: tier.price,
              })),
            }
          : undefined,

      highlights,
      inclusions,
      exclusions,
      accommodations,

      overviewItinerary: parseOptionalString(formData.get("overviewItinerary")),
      itinerary: parseOptionalString(formData.get("itinerary")),

      mainImageUrl: null,
      mapImageUrl: null,
      brochureUrl: null,

      featured: formData.get("featured") === "on",
      isPublished: formData.get("isPublished") === "on",
      requiresQuote:
        pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC"
          ? true
          : formData.get("requiresQuote") === "on",

      seasonalPrices: {
        create: [
          {
            season: "LOW",
            price: seasonalLow ?? 0,
          },
          {
            season: "SHOULDER",
            price: seasonalShoulder ?? 0,
          },
          {
            season: "HIGH",
            price: seasonalHigh ?? 0,
          },
          {
            season: "PEAK",
            price: seasonalPeak ?? 0,
          },
        ],
      },
    },
  });

  redirect("/admin/tours");
}

export default function CreateTourPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Tour</h1>
        <p className="text-sm text-muted-foreground">
          Add a new pilgrimage, cultural, historical, or thematic tour.
        </p>
      </div>

      <TourForm action={createTour} />
    </div>
  );
}