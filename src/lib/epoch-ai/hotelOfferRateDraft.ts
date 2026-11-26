import { z } from "zod";
import { manualHotelOfferStay, type HotelOfferTerms } from "./receivedHotelOffer";

export const OFFER_RATE_SOURCE = "REVIEWED_HOTEL_OFFER";
export const HOTEL_OFFER_RATE_IMPORT_EVENT = "HOTEL_OFFER_RATES_SAVED";
export const offerRoomFields = { doubleTwin: "Double/Twin", single: "Single", triple: "Triple" } as const;
export const nightlyUnits = ["PER_ROOM_PER_NIGHT", "PER_PERSON_PER_NIGHT"] as const;
export const supplementaryUnits = [...nightlyUnits, "PER_PERSON", "PER_MEAL"] as const;

const money = z.string().regex(/^\d{1,9}(?:\.\d{1,2})?$/).refine(value => Number(value) > 0);
const optionalMoney = z.union([z.literal(""), money]);
const charge = z.object({ amount: optionalMoney, unit: z.union([z.literal(""), z.enum(supplementaryUnits)]) })
  .refine(({amount, unit}) => Boolean(amount) === Boolean(unit), "Enter both the amount and billing unit for each charge.");

export const hotelOfferRateApproval = z.object({
  confirmation: z.literal("APPROVE_HOTEL_OFFER_RATES"),
  supplierConfirmation: z.string().trim().min(5).max(500),
  activateSupplier: z.boolean(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  unit: z.enum(nightlyUnits),
  taxIncluded: z.literal(true),
  mealBasis: z.enum(["BB", "HB"]),
  doubleTwin: money,
  single: money,
  triple: optionalMoney,
  extraBed: optionalMoney,
  halfBoard: charge,
  beverages: charge,
  cityTaxIncluded: z.boolean(),
  cityTax: charge.refine(({unit}) => !unit || unit === "PER_ROOM_PER_NIGHT" || unit === "PER_PERSON_PER_NIGHT"),
  porterage: charge,
}).strict().refine(data => !data.cityTaxIncluded || !data.cityTax.amount);

export function hotelOfferStay(city: string, checkIn: string, checkOut: string) {
  const stay = manualHotelOfferStay.safeParse([city, checkIn, checkOut]);
  return stay.success ? {city, checkIn, checkOut} : null;
}

function exactPrice(text: string) {
  if (/\b(?:from|approx\w*|estimated|starting|up to|or|to be confirmed|about)\b|[~≈$]|\d\s*[–—-]\s*\d/i.test(text)) return null;
  const prices = [...text.matchAll(/(?:\b(EUR|USD|GBP|CHF)\s*|([€$£])\s*)(\d{1,9}(?:[.,]\d{1,2})?)(?![\d.,]\d)|\b(\d{1,9}(?:[.,]\d{1,2})?)\s*(EUR|USD|GBP|CHF)\b/gi)];
  if (!prices.length) return null;
  const currencies: Record<string, string> = {"€": "EUR", "$": "USD", "£": "GBP"};
  const values = prices.map(([, prefix, symbol, amount, reversed, suffix]) => ({
    currency: (prefix ?? suffix ?? currencies[symbol]).toUpperCase(),
    amount: (amount ?? reversed).replace(",", "."),
  }));
  const first = values[0];
  return money.safeParse(first.amount).success &&
    values.every(item => item.currency === first.currency && Number(item.amount) === Number(first.amount)) ? first : null;
}

function quotedUnit(text: string) {
  if (/per (?:person|guest)[ /-]+(?:per )?night|\/person\/night/i.test(text)) return "PER_PERSON_PER_NIGHT";
  if (/per room[ /-]+(?:per )?night|\/room\/night/i.test(text)) return "PER_ROOM_PER_NIGHT";
  if (/per (?:meal|dinner)/i.test(text)) return "PER_MEAL";
  return "";
}

export function prepareHotelOfferRateDraft(terms: HotelOfferTerms) {
  const double = exactPrice(terms.doubleTwin);
  const single = exactPrice(terms.single);
  const currency = double?.currency ?? single?.currency ?? "";
  const amount = (candidate: ReturnType<typeof exactPrice>) => candidate?.currency === currency ? candidate.amount : "";
  const extraBed = /\b(?:extra|additional) bed\b/i.test(terms.triple);
  const roomUnit = quotedUnit(terms.doubleTwin);
  const chargeDraft = (text: string) => {
    const value = amount(exactPrice(text));
    return {amount: value, unit: value ? quotedUnit(text) : ""};
  };

  return {
    currency,
    unit: roomUnit === quotedUnit(terms.single) && roomUnit !== "PER_MEAL" ? roomUnit : "",
    mealBasis: /(?:rates?|prices?) include breakfast|breakfast included/i.test(terms.other) ? "BB" : "",
    taxIncluded: /\bVAT included\b|\b(?:rates?|prices?) include[^.]*\bVAT\b/i.test(terms.other) ? "yes" : "",
    doubleTwin: amount(double),
    single: amount(single),
    triple: extraBed ? "" : amount(exactPrice(terms.triple)),
    extraBed: extraBed && /per night/i.test(terms.triple) ? amount(exactPrice(terms.triple)) : "",
    halfBoard: chargeDraft(terms.halfBoard),
    beverages: chargeDraft(terms.beverages),
    cityTaxIncluded: /\bcity tax (?:is )?included\b/i.test(terms.cityTax) && !/\b(?:not|excluded?)\b/i.test(terms.cityTax),
    cityTax: chargeDraft(terms.cityTax),
    porterage: chargeDraft(terms.porterage),
  };
}
