import { Prisma, PricingType, RoomType } from "@prisma/client";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import TourForm from "@/components/admin/TourForm";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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

function isRoomType(value: string): value is RoomType {
  return (
    value === "SINGLE" ||
    value === "DOUBLE_TWIN" ||
    value === "TRIPLE"
  );
}

type PrivatePricing = Record<string, number>;

function parsePrivatePricing(value: FormDataEntryValue | null): PrivatePricing {
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    const result: PrivatePricing = {};

    for (const key of Object.keys(parsed)) {
      const num = Number(parsed[key]);
      if (!Number.isNaN(num) && num > 0) {
        result[key] = num;
      }
    }

    return result;
  } catch {
    return {};
  }
}

type ParsedPricingTier = {
  label: string | null;
  minPax: number | null;
  maxPax: number | null;
  roomType: RoomType | null;
  pricePerPerson: number;
  currency: string;
  isActive: boolean;
};

function parsePricingTiers(value: FormDataEntryValue | null): ParsedPricingTier[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as Array<{
      label?: string;
      minPax?: number | string;
      maxPax?: number | string;
      roomType?: string;
      pricePerPerson?: number | string;
      currency?: string;
      isActive?: boolean;
    }>;

    if (!Array.isArray(parsed)) return [];

    const result: ParsedPricingTier[] = [];

    for (const tier of parsed) {
      const label =
        typeof tier.label === "string" && tier.label.trim()
          ? tier.label.trim()
          : null;

      const minPaxRaw =
        tier.minPax === "" || tier.minPax === undefined || tier.minPax === null
          ? null
          : Number(tier.minPax);

      const maxPaxRaw =
        tier.maxPax === "" || tier.maxPax === undefined || tier.maxPax === null
          ? null
          : Number(tier.maxPax);

      const priceRaw = Number(tier.pricePerPerson);

      if (Number.isNaN(priceRaw) || priceRaw <= 0) {
        continue;
      }

      const minPax =
        minPaxRaw === null || Number.isNaN(minPaxRaw) ? null : minPaxRaw;

      const maxPax =
        maxPaxRaw === null || Number.isNaN(maxPaxRaw) ? null : maxPaxRaw;

      const roomType =
        typeof tier.roomType === "string" && isRoomType(tier.roomType)
          ? tier.roomType
          : null;

      const currency =
        typeof tier.currency === "string" && tier.currency.trim()
          ? tier.currency.trim().toUpperCase()
          : "EUR";

      result.push({
        label,
        minPax,
        maxPax,
        roomType,
        pricePerPerson: priceRaw,
        currency,
        isActive: tier.isActive ?? true,
      });
    }

    return result;
  } catch {
    return [];
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

async function saveFile(file: File | null, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;

  const directoryPath = path.join(process.cwd(), "public", folder);
  await mkdir(directoryPath, { recursive: true });

  const filePath = path.join(directoryPath, fileName);
  await writeFile(filePath, buffer);

  return `/${folder}/${fileName}`;
}

async function createTour(formData: FormData) {
  "use server";

  const title = formData.get("title")?.toString().trim();
  const category = formData.get("category")?.toString().trim();
  const duration = Number(formData.get("duration"));
  const pricingTypeRaw = formData.get("pricingType")?.toString().trim();

  if (
    !title ||
    !category ||
    Number.isNaN(duration) ||
    duration < 1 ||
    !isPricingType(pricingTypeRaw || "")
  ) {
    return;
  }

  const pricingType = pricingTypeRaw as PricingType;

  const destinations = parseCommaSeparated(formData.get("destinations"));
  const subcategories = parseCommaSeparated(formData.get("subcategories"));
  const tags = parseCommaSeparated(formData.get("tags"));
  const highlights = parseCommaSeparated(formData.get("highlights"));
  const inclusions = parseCommaSeparated(formData.get("inclusions"));
  const exclusions = parseCommaSeparated(formData.get("exclusions"));
  const accommodations = parseCommaSeparated(formData.get("accommodations"));

  const privatePricing = parsePrivatePricing(formData.get("privatePricing"));
  const hasPrivatePricing = Object.keys(privatePricing).length > 0;

  const pricingTiers = parsePricingTiers(formData.get("pricingTiers"));

  const mainImage = formData.get("mainImage") as File | null;
  const image2 = formData.get("image2") as File | null;
  const image3 = formData.get("image3") as File | null;
  const image4 = formData.get("image4") as File | null;
  const mapImage = formData.get("mapImage") as File | null;
  const brochure = formData.get("brochure") as File | null;

  const mainImageUrl = await saveFile(mainImage, "uploads/tours");
  const imageUrl2 = await saveFile(image2, "uploads/tours");
  const imageUrl3 = await saveFile(image3, "uploads/tours");
  const imageUrl4 = await saveFile(image4, "uploads/tours");
  const mapImageUrl = await saveFile(mapImage, "uploads/maps");
  const brochureUrl = await saveFile(brochure, "uploads/brochures");

  const tour = await db.tour.create({
    data: {
      title,
      category,
      subcategories,
      tags,
      destinations,
      duration,

      shortDescription: parseOptionalString(formData.get("shortDescription")),
      overview: parseOptionalString(formData.get("overview")),
      whyWeOfferThisTour: parseOptionalString(
        formData.get("whyWeOfferThisTour")
      ),
      tourIntroduction: parseOptionalString(formData.get("tourIntroduction")),
      tourSignificance: parseOptionalString(formData.get("tourSignificance")),
      destinationBriefs: parseOptionalString(
        formData.get("destinationBriefs")
      ),

      pricingType,
      privatePricing: hasPrivatePricing
        ? (privatePricing as Prisma.InputJsonValue)
        : undefined,

      highlights,
      inclusions,
      exclusions,
      accommodations,

      overviewItinerary: parseOptionalString(
        formData.get("overviewItinerary")
      ),
      itinerary: parseOptionalString(formData.get("itinerary")),

      mainImageUrl,
      imageUrl2,
      imageUrl3,
      imageUrl4,
      mapImageUrl,
      brochureUrl,

      featured: formData.get("featured") === "on",
      isPublished: formData.get("isPublished") === "on",

      requiresQuote:
        pricingType === "GROUP_BASED" || pricingType === "FIT_DYNAMIC"
          ? true
          : formData.get("requiresQuote") === "on",
    },
  });

  if (pricingTiers.length > 0) {
    await db.pricingTier.createMany({
      data: pricingTiers.map((tier) => ({
        tourId: tour.id,
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