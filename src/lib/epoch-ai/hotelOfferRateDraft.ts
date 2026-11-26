import { z } from "zod";
import { manualHotelOfferStay, type HotelOfferTerms } from "./receivedHotelOffer";

export const OFFER_RATE_SOURCE = "REVIEWED_HOTEL_OFFER";
export const HOTEL_OFFER_RATE_IMPORT_EVENT = "HOTEL_OFFER_RATES_SAVED";
export const offerRoomFields = { doubleTwin: "Double/Twin", single: "Single", triple: "Triple" } as const;
export const nightlyUnits = ["PER_ROOM_PER_NIGHT", "PER_PERSON_PER_NIGHT"] as const;
export const supplementaryUnits = [...nightlyUnits, "PER_PERSON", "PER_MEAL"] as const;
export const offerChargeFields = {
  halfBoard: "Half-board supplement", beverages: "Dinner beverages", cityTax: "City tax", porterage: "Porterage",
} as const;
type OfferChargeKey = keyof typeof offerChargeFields;

const money = z.string().regex(/^\d{1,9}(?:\.\d{1,2})?$/).refine(value => Number(value) > 0);
const optionalMoney = z.union([z.literal(""), money]);
const charge = z.object({ amount: optionalMoney, unit: z.union([z.literal(""), z.enum(supplementaryUnits)]) })
  .refine(({amount, unit}) => Boolean(amount) === Boolean(unit), "Enter both the amount and billing unit for each charge.");

export const hotelOfferRateApproval = z.object({
  confirmation: z.literal("APPROVE_HOTEL_OFFER_RATES"),
  supplierConfirmation: z.string().trim().min(5).max(500),
  activateSupplier: z.boolean(),
  confirmIndicativeCharges: z.boolean().optional(),
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

function quotedPrice(text: string) {
  if (/\$|\d\s*(?:[–—-]|\b(?:to|or)\b)\s*\d/i.test(text)) return null;
  const prices = [...text.matchAll(/(?:\b(EUR|USD|GBP|CHF)\s*|([€£])\s*)(\d{1,9}(?:[.,]\d{1,2})?)(?!\d|[.,]\d)|(?<![\d.,])(\d{1,9}(?:[.,]\d{1,2})?)\s*(EUR|USD|GBP|CHF)\b(?!\s*\d)/gi)];
  if (!prices.length) return null;
  const currencies: Record<string, string> = {"€": "EUR", "£": "GBP"};
  const values = prices.map(([, prefix, symbol, amount, reversed, suffix]) => ({
    currency: (prefix ?? suffix ?? currencies[symbol]).toUpperCase(),
    amount: (amount ?? reversed).replace(",", "."),
  }));
  const first = values[0];
  return money.safeParse(first.amount).success &&
    values.every(item => item.currency === first.currency && Number(item.amount) === Number(first.amount)) ? first : null;
}

export function hotelOfferPriceQualifier(text: string) {
  if (/\b(?:from|start(?:s|ing) at|minimum)\b/i.test(text)) return "Starting price";
  if (/\b(?:approx\w*|estimated?|about|around)\b|[~≈]/i.test(text)) return "Approximate";
  if (/\b(?:up to|to be confirmed|indicative|subject to change)\b/i.test(text)) return "Indicative";
  return null;
}

function exactPrice(text: string) {
  return hotelOfferPriceQualifier(text) ? null : quotedPrice(text);
}

function quotedUnit(text: string, charge = false) {
  const person = /\bper (?:person|guest|pax)\b|\/(?:person|guest|pax)\b/i.test(text);
  const room = /\bper room\b|\/room\b/i.test(text);
  const night = /\b(?:per|each) night\b|\/night\b/i.test(text);
  const meal = /\bper (?:meal|dinner)\b|\/(?:meal|dinner)\b/i.test(text);
  if ((person && room) || (night && meal) || (charge && room && meal)) return "";
  if (person && night) return "PER_PERSON_PER_NIGHT";
  if (room && night) return "PER_ROOM_PER_NIGHT";
  if (charge && meal) return "PER_MEAL";
  if (charge && person) return "PER_PERSON";
  return "";
}

export function hotelOfferChargeUnit(text: string, key: OfferChargeKey) {
  if (/\b(?:per|each) (?:bag|piece|day|group)\b|\/(?:bag|piece|day|group)\b|\bnot (?:charged )?per\b/i.test(text)) return "";
  const unit = quotedUnit(text, true);
  if (unit) return key !== "cityTax" || unit === "PER_ROOM_PER_NIGHT" || unit === "PER_PERSON_PER_NIGHT" ? unit : "";
  if (key === "cityTax" ||
      /\b(?:per|each)\b|\/(?:bag|piece|person|guest|room|night|meal|stay|day|group)\b|\b(?:flat|fixed) fee\b/i.test(text)) return "";
  return "PER_PERSON_PER_NIGHT";
}

export function prepareHotelOfferRateDraft(terms: HotelOfferTerms) {
  const double = exactPrice(terms.doubleTwin);
  const single = exactPrice(terms.single);
  const currency = double?.currency ?? single?.currency ?? "";
  const amount = (candidate: ReturnType<typeof exactPrice>) => candidate?.currency === currency ? candidate.amount : "";
  const extraBed = /\b(?:extra|additional) bed\b/i.test(terms.triple);
  const roomUnit = quotedUnit(terms.doubleTwin);
  const chargeDraft = (key: OfferChargeKey) => {
    const text = terms[key];
    const value = amount(quotedPrice(text));
    return {amount: value, unit: value ? hotelOfferChargeUnit(text, key) : ""};
  };
  const cityTaxIncluded = /\bcity tax (?:is )?included\b/i.test(terms.cityTax) && !/\b(?:not|excluded?)\b/i.test(terms.cityTax);

  return {
    currency,
    unit: roomUnit === quotedUnit(terms.single) ? roomUnit : "",
    mealBasis: /(?:rates?|prices?) include breakfast|breakfast included/i.test(terms.other) ? "BB" : "",
    taxIncluded: /\bVAT included\b|\b(?:rates?|prices?) include[^.]*\bVAT\b/i.test(terms.other) ? "yes" : "",
    doubleTwin: amount(double),
    single: amount(single),
    triple: extraBed ? "" : amount(exactPrice(terms.triple)),
    extraBed: extraBed && /per night/i.test(terms.triple) ? amount(exactPrice(terms.triple)) : "",
    halfBoard: chargeDraft("halfBoard"),
    beverages: chargeDraft("beverages"),
    cityTaxIncluded,
    cityTax: cityTaxIncluded ? {amount: "", unit: ""} : chargeDraft("cityTax"),
    porterage: chargeDraft("porterage"),
  };
}
