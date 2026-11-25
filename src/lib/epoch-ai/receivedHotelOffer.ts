import { z } from "zod";

export const hotelOfferFields = {
  availability: "Availability, stay dates and allotment",
  doubleTwin: "Double/Twin rate",
  single: "Single rate",
  triple: "Triple rate",
  halfBoard: "Half-board supplement",
  beverages: "Dinner beverages",
  cityTax: "City tax",
  porterage: "Porterage",
  payment: "Payment and deposit terms",
  cancellation: "Cancellation and release terms",
  validity: "Offer validity",
  other: "Other conditions or unclear terms",
} as const;

export type HotelOfferTerms = Record<keyof typeof hotelOfferFields, string>;
const term = z.string().trim().max(2000);
export const hotelOfferTerms = z.object({
  availability: term, doubleTwin: term, single: term, triple: term,
  halfBoard: term, beverages: term, cityTax: term, porterage: term,
  payment: term, cancellation: term, validity: term, other: term,
}).strict();

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

export const hotelOfferSource = z.object({
  sender: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(300),
  receivedDate: dateOnly,
  messageId: z.string().trim().max(500),
  body: z.string().max(32000),
});

export const maxHotelOfferFileSize = 3 * 1024 * 1024;

export const manualHotelOfferStay = z.tuple([z.string().trim().min(1).max(100), dateOnly, dateOnly])
  .refine(([, checkIn, checkOut]) => checkIn < checkOut);

export type ManualHotelOffer = { tourId: string; supplierId: string; stayKey: string };

export function manualHotelOfferScope(url: string) {
  const params = new URL(url).searchParams;
  const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
  const tourId = id.safeParse(params.get("tourId"));
  const supplierId = id.safeParse(params.get("supplierId"));
  try {
    const stay = manualHotelOfferStay.safeParse(JSON.parse(params.get("stayKey") ?? "null"));
    if (tourId.success && supplierId.success && stay.success) {
      return {
        manualHotelTourId: tourId.data,
        supplierId: supplierId.data,
        manualHotelStayKey: JSON.stringify(stay.data),
      };
    }
  } catch { /* Invalid stay key. */ }
  return null;
}
