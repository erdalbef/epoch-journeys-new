import type { Prisma, PrismaClient } from "@prisma/client";
import { hotelOfferDeadlines } from "./hotelOfferDeadlines";
import { HOTEL_OFFER_RATE_IMPORT_EVENT, hotelOfferStay } from "./hotelOfferRateDraft";
import { hotelOfferTerms, manualHotelOfferStay } from "./receivedHotelOffer";

type OfferClient = Pick<PrismaClient, "supplierCommercialEvidence">;

export type HotelOfferStay = { tourId: string; city: string; checkIn: string; checkOut: string };

export const hotelOfferSourceOrder: Prisma.SupplierCommercialEvidenceOrderByWithRelationInput[] = [
  { sourceDate: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
  { version: "desc" },
  { id: "desc" },
];

export const currentHotelOfferFilter = { acceptanceStatus: { notIn: ["REJECTED", "SUPERSEDED"] } } satisfies
  Prisma.SupplierCommercialEvidenceWhereInput;

export function recordedHotelOfferStay(record: {
  supplierId: string;
  manualHotelTourId?: string | null;
  manualHotelStayKey?: string | null;
  hotelInquiry?: { tourId: string; supplierId: string; destination: string; checkIn: string; checkOut: string } | null;
}): HotelOfferStay | null {
  const inquiry = record.hotelInquiry;
  if (inquiry && inquiry.supplierId === record.supplierId) {
    const stay = hotelOfferStay(inquiry.destination, inquiry.checkIn, inquiry.checkOut);
    return stay && {tourId: inquiry.tourId, ...stay};
  }
  if (record.manualHotelTourId && record.manualHotelStayKey) {
    try {
      const parsed = manualHotelOfferStay.safeParse(JSON.parse(record.manualHotelStayKey));
      if (parsed.success) {
        const [city, checkIn, checkOut] = parsed.data;
        return {tourId: record.manualHotelTourId, city, checkIn, checkOut};
      }
    } catch { /* A legacy record may not have a usable stay. */ }
  }
  return null;
}

export const hotelOfferStaySelect = {
  manualHotelTourId: true,
  manualHotelStayKey: true,
  hotelInquiry: { select: { tourId: true, supplierId: true, destination: true, checkIn: true, checkOut: true } },
} satisfies Prisma.SupplierCommercialEvidenceSelect;

/** Compare offers for the same supplier and stay, including those recorded from a different screen. */
export async function loadHotelOfferWorkflow(
  client: OfferClient, {tourId, city, checkIn, checkOut}: HotelOfferStay, supplierId?: string,
) {
  const offers = await client.supplierCommercialEvidence.findMany({
    where: {
      ...currentHotelOfferFilter, ...(supplierId ? {supplierId} : {}),
      OR: [
        { hotelInquiry: { tourId, destination: { equals: city, mode: "insensitive" }, checkIn, checkOut } },
        { manualHotelTourId: tourId, manualHotelStayKey: { equals: JSON.stringify([city, checkIn, checkOut]), mode: "insensitive" } },
      ],
    },
    orderBy: hotelOfferSourceOrder,
    select: {
      id: true, supplierId: true, version: true, reviewStatus: true, reviewedTerms: true, sourceDate: true,
      acceptanceStatus: true, supplier: { select: { name: true, status: true } },
      events: { where: { eventType: HOTEL_OFFER_RATE_IMPORT_EVENT }, take: 1, select: { id: true } },
    },
  });
  const currentBySupplier = new Map<string, (typeof offers)[number]>();
  for (const offer of offers) {
    if (!currentBySupplier.has(offer.supplierId)) currentBySupplier.set(offer.supplierId, offer);
  }
  return {offers, currentBySupplier};
}

type CurrentOffer = Awaited<ReturnType<typeof loadHotelOfferWorkflow>>["offers"][number];

export function verifiedHotelOfferTerms(offer: Pick<CurrentOffer, "reviewedTerms" | "reviewStatus" | "acceptanceStatus">) {
  if (offer.reviewStatus !== "TERMS_VERIFIED" || offer.acceptanceStatus === "REJECTED" ||
      offer.acceptanceStatus === "SUPERSEDED") return null;
  const result = hotelOfferTerms.safeParse(offer.reviewedTerms);
  return result.success ? result.data : null;
}

export function currentHotelOfferBlock(offerId: string, current?: Pick<CurrentOffer, "id" | "sourceDate" | "version">) {
  if (current?.id === offerId) return null;
  if (!current) return "No current offer is available for this hotel stay.";
  const received = current.sourceDate?.toISOString().slice(0, 10);
  return received
    ? `Use the latest supplier offer, received ${received} (version ${current.version}).`
    : `Use the latest supplier offer (version ${current.version}).`;
}

export function hotelOfferRateReadiness(offer: CurrentOffer, checkIn: string, today: string) {
  const terms = verifiedHotelOfferTerms(offer);
  if (!terms) return "REVIEW_TERMS";
  if (offer.acceptanceStatus !== "RECORDED_ACCEPTED" &&
      hotelOfferDeadlines(terms, offer.sourceDate?.toISOString().slice(0, 10) ?? "", checkIn)
        .some(deadline => deadline.kind === "expiry" && deadline.date < today)) return "RECONFIRM";
  if (!offer.events.length) return "APPROVE_RATES";
  if (offer.supplier.status !== "ACTIVE") return "ACTIVATE_SUPPLIER";
  return "READY";
}

export const hotelOfferRateNextSteps = {
  REVIEW_TERMS: "Review the supplier offer.",
  RECONFIRM: "Reconfirm the expired offer with the hotel.",
  APPROVE_RATES: "Terms verified. Approve the room rates in Supplier CRM.",
  ACTIVATE_SUPPLIER: "Rates saved. Review the supplier's inactive status.",
  READY: "Rates approved in Supplier CRM.",
} as const;
