import { z } from "zod";
import { manualHotelOfferStay, type HotelOfferTerms } from "./receivedHotelOffer";

export const OFFER_RATE_SOURCE = "REVIEWED_HOTEL_OFFER";
export const HOTEL_OFFER_RATE_IMPORT_EVENT = "HOTEL_OFFER_RATES_SAVED";
export const HOTEL_OFFER_RATE_DRAFT_EVENT = "HOTEL_OFFER_RATE_DRAFT_SAVED";
export const offerRoomFields = { doubleTwin: "Double/Twin", single: "Single", triple: "Triple" } as const;
export const nightlyUnits = ["PER_ROOM_PER_NIGHT", "PER_PERSON_PER_NIGHT"] as const;
export const supplementaryUnits = [...nightlyUnits, "PER_PERSON", "PER_MEAL"] as const;
export const offerChargeFields = {
  halfBoard: "Half-board supplement", beverages: "Dinner beverages", cityTax: "City tax", porterage: "Porterage",
} as const;
type OfferChargeKey = keyof typeof offerChargeFields;

const money = z.string().regex(/^\d{1,9}(?:\.\d{1,2})?$/).refine(value => Number(value) > 0);
const optionalMoney = z.union([z.literal(""), money]);
const charge = z.object({ amount: optionalMoney, unit: z.union([z.literal(""), z.enum(supplementaryUnits)]) });

export const hotelOfferRateApproval = z.object({
  confirmation: z.literal("APPROVE_HOTEL_OFFER_RATES"),
  supplierConfirmation: z.string().trim().max(500).optional(),
  activateSupplier: z.boolean(),
  confirmIndicativeCharges: z.boolean().optional(),
  currency: z.string().regex(/^(?:[A-Z]{3})?$/),
  unit: z.union([z.literal(""), z.enum(nightlyUnits)]),
  taxIncluded: z.union([z.enum(["", "yes", "no"]), z.boolean()]),
  mealBasis: z.enum(["", "BB", "HB"]),
  doubleTwin: optionalMoney,
  single: optionalMoney,
  triple: optionalMoney,
  extraBed: optionalMoney,
  halfBoard: charge,
  beverages: charge,
  cityTaxIncluded: z.boolean(),
  cityTax: charge.refine(({unit}) => !unit || unit === "PER_ROOM_PER_NIGHT" || unit === "PER_PERSON_PER_NIGHT"),
  porterage: charge,
}).strict().refine(data => !data.cityTaxIncluded || !data.cityTax.amount, {path: ["cityTax"]});

export type HotelOfferRateApproval = z.infer<typeof hotelOfferRateApproval>;

export function canSaveHotelRoomRates(
  rates: HotelOfferRateApproval,
): rates is HotelOfferRateApproval & {unit: (typeof nightlyUnits)[number]} {
  return Boolean(rates.currency && rates.unit && (rates.doubleTwin || rates.single || rates.triple));
}

export function hotelOfferRateWarnings(rates: HotelOfferRateApproval, terms: HotelOfferTerms) {
  const warnings: string[] = [];
  if (!rates.currency) warnings.push("Room currency is missing.");
  if (!rates.unit) warnings.push("Room billing unit is missing or unclear.");
  if (!rates.mealBasis) warnings.push("Meal basis is missing or unclear.");
  if (rates.taxIncluded === "") warnings.push("VAT treatment is missing or unclear.");
  if (rates.taxIncluded === "no" || rates.taxIncluded === false) warnings.push("VAT is excluded from the room prices.");
  const missingRooms = (Object.keys(offerRoomFields) as (keyof typeof offerRoomFields)[])
    .filter(key => key !== "triple" && !rates[key]).map(key => offerRoomFields[key]);
  if (missingRooms.length === 1) warnings.push(`${missingRooms[0]} room price is missing.`);
  if (missingRooms.length > 1) warnings.push(`${missingRooms.join(" and ")} room prices are missing.`);
  const missingDetails = [];
  if (!terms.availability) missingDetails.push("availability");
  if (!terms.validity) missingDetails.push("offer validity");
  if (!terms.payment) missingDetails.push("payment terms");
  if (!terms.cancellation) missingDetails.push("cancellation terms");
  if (missingDetails.length) warnings.push(`Supplier details to check: ${missingDetails.join(", ")}.`);
  for (const key of Object.keys(offerChargeFields) as (keyof typeof offerChargeFields)[]) {
    const {amount, unit} = rates[key];
    if (!amount) continue;
    const charge = [rates.currency, amount].filter(Boolean).join(" ");
    if (!unit) warnings.push(`${offerChargeFields[key]} (${charge}) needs a billing unit.`);
    if (!rates.confirmIndicativeCharges && hotelOfferPriceQualifier(terms[key])) {
      warnings.push(`${offerChargeFields[key]} (${charge}) is indicative and is excluded from the costing.`);
    }
  }
  if (!rates.cityTaxIncluded && !rates.cityTax.amount) {
    warnings.push(/\binsurance\b/i.test(terms.cityTax)
      ? `Confirm whether the combined charge is included or extra. Supplier wording: ${terms.cityTax}`
      : "City tax is unspecified or unconfirmed and is excluded from the costing.");
  }
  return warnings;
}

export function hotelOfferRateApprovalIssues(issues: ReadonlyArray<{ path: readonly PropertyKey[] }>) {
  const messages: Record<string, string> = {
    unit: "Choose a supported room rate unit or leave it blank.",
    currency: "Use a three-letter currency code, such as EUR, or leave it blank.",
    doubleTwin: "Enter a valid Double/Twin price.",
    single: "Enter a valid Single price.",
    triple: "Enter a valid Triple price or leave it blank.",
    extraBed: "Enter a valid extra-bed price or leave it blank.",
    cityTax: "Check the city tax amount, unit and inclusion status.",
    halfBoard: "Check the half-board amount and billing unit.",
    beverages: "Check the drinks amount and billing unit.",
    porterage: "Check the porterage amount and billing unit.",
  };
  return [...new Set(issues.map(({path}) => messages[String(path[0])] ?? "Check the rate approval details."))];
}

export function hotelOfferStay(city: string, checkIn: string, checkOut: string) {
  const stay = manualHotelOfferStay.safeParse([city, checkIn, checkOut]);
  return stay.success ? {city, checkIn, checkOut} : null;
}

function quotedPrice(text: string, preferGroup = false) {
  if (/\$|\d\s*(?:[–—-]|\b(?:to|or)\b)\s*\d/i.test(text)) return null;
  const prices = [...text.matchAll(/(?:\b(EUR|USD|GBP|CHF)\s*|([€£])\s*)(\d{1,9}(?:[.,]\d{1,2})?)(?!\d|[.,]\d)|(?<![\d.,])(\d{1,9}(?:[.,]\d{1,2})?)\s*(EUR|USD|GBP|CHF)\b(?!\s*\d)/gi)];
  if (!prices.length) return null;
  const currencies: Record<string, string> = {"€": "EUR", "£": "GBP"};
  const values = prices.map(([, prefix, symbol, amount, reversed, suffix]) => ({
    currency: (prefix ?? suffix ?? currencies[symbol]).toUpperCase(),
    amount: (amount ?? reversed).replace(",", "."),
  }));
  const categories = prices.map(match =>
    /^\s*\(\s*(FIT|GROUP)\s*\)/i.exec(text.slice(match.index + match[0].length))?.[1].toUpperCase());
  if (preferGroup && categories.includes("FIT") && categories.some(category => !category)) return null;
  const candidates = preferGroup && categories.every(Boolean)
    ? values.filter((_, index) => categories[index] === "GROUP")
    : values;
  const first = candidates[0];
  return first && money.safeParse(first.amount).success &&
    candidates.every(item => item.currency === first.currency && Number(item.amount) === Number(first.amount)) ? first : null;
}

export function hotelOfferPriceQualifier(text: string) {
  if (/\b(?:from|start(?:s|ing) at|minimum)\b/i.test(text)) return "Starting price";
  if (/\b(?:approx\w*|estimated?|about|around)\b|[~≈]/i.test(text)) return "Approximate";
  if (/\b(?:up to|to be confirmed|indicative|subject to change)\b/i.test(text)) return "Indicative";
  return null;
}

function exactPrice(text: string, preferGroup = false) {
  return hotelOfferPriceQualifier(text) ? null : quotedPrice(text, preferGroup);
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
  return key !== "cityTax" || unit === "PER_ROOM_PER_NIGHT" || unit === "PER_PERSON_PER_NIGHT" ? unit : "";
}

function roomRateWithoutItemizedCharges(text: string) {
  const parts = text.split(/\s+\+\s+/);
  return parts.length === 2 && /\b(?:tax|insurance)\b/i.test(parts[1]) &&
    quotedPrice(parts[1]) ? parts[0] : text;
}

export function prepareHotelOfferRateDraft(terms: HotelOfferTerms, singleNight = false) {
  const doubleText = roomRateWithoutItemizedCharges(terms.doubleTwin);
  const singleText = roomRateWithoutItemizedCharges(terms.single);
  const tripleText = roomRateWithoutItemizedCharges(terms.triple);
  const double = exactPrice(doubleText, true);
  const single = exactPrice(singleText, true);
  const extraBed = /\b(?:extra|additional) bed\b/i.test(terms.triple);
  const triple = extraBed ? null : exactPrice(tripleText, true);
  const currency = double?.currency ?? single?.currency ?? triple?.currency ?? "";
  const amount = (candidate: ReturnType<typeof exactPrice>) => candidate?.currency === currency ? candidate.amount : "";
  const nightlyText = (text: string) => singleNight ? text.replace(/\bper day\b|\/day\b/gi, " per night") : text;
  const roomTexts = [
    {price: double, text: doubleText}, {price: single, text: singleText}, {price: triple, text: tripleText},
  ].filter(({price}) => amount(price));
  const quotedUnits = roomTexts.map(({text}) => quotedUnit(nightlyText(text)));
  const roomUnit = quotedUnits.find(Boolean) ?? "";
  const agreedUnit = quotedUnits.every((unit, index) => unit === roomUnit ||
    (singleNight && !unit && !/\b(?:per|each)\b|\//i.test(roomTexts[index].text))) ? roomUnit : "";
  const chargeDraft = (key: OfferChargeKey) => {
    const text = terms[key];
    const value = amount(quotedPrice(text));
    return {amount: value, unit: value ? hotelOfferChargeUnit(nightlyText(text), key) : ""};
  };
  const combinedTaxAndInsurance = /\binsurance\b/i.test(terms.cityTax);
  const cityTaxIncluded = !combinedTaxAndInsurance && (
    (/\bcity tax (?:is )?included\b/i.test(terms.cityTax) && !/\b(?:not|excluded?)\b/i.test(terms.cityTax)) ||
    /\b(?:no (?:city|local) tax|(?:city|local) tax (?:does not apply|is not charged))\b/i.test(terms.cityTax)
  );
  const taxExcluded = /\bVAT (?:is )?(?:not included|excluded)\b|\b(?:rates?|prices?) exclude[^.]*\bVAT\b/i.test(terms.other);

  return {
    currency,
    unit: agreedUnit,
    mealBasis: /(?:rates?|prices?) include breakfast|breakfast included/i.test(terms.other) ? "BB" : "",
    taxIncluded: taxExcluded ? "no" : /\bVAT (?:is )?included\b|\b(?:rates?|prices?) include[^.]*\bVAT\b/i.test(terms.other) ? "yes" : "",
    doubleTwin: amount(double),
    single: amount(single),
    triple: amount(triple),
    extraBed: extraBed && /per night/i.test(terms.triple) ? amount(exactPrice(terms.triple)) : "",
    halfBoard: chargeDraft("halfBoard"),
    beverages: chargeDraft("beverages"),
    cityTaxIncluded,
    cityTax: cityTaxIncluded || combinedTaxAndInsurance ? {amount: "", unit: ""} : chargeDraft("cityTax"),
    porterage: chargeDraft("porterage"),
  };
}

export type HotelOfferRateDraftValues = ReturnType<typeof prepareHotelOfferRateDraft>;

export function fillHotelOfferRateDraft(
  base: HotelOfferRateDraftValues,
  source: HotelOfferRateDraftValues,
  terms: HotelOfferTerms,
): HotelOfferRateDraftValues {
  if (base.currency && source.currency && base.currency !== source.currency) return base;
  const useSourceRooms = !base.unit || !source.unit || base.unit === source.unit;
  const fillCharge = (key: keyof typeof offerChargeFields) => {
    const current = base[key];
    const suggested = source[key];
    if (current.amount && Number(current.amount) !== Number(suggested.amount)) return current;
    return {amount: current.amount || suggested.amount, unit: current.unit || suggested.unit};
  };
  const cityTax = /\binsurance\b/i.test(terms.cityTax) ? base.cityTax : fillCharge("cityTax");
  return {
    currency: base.currency || source.currency,
    unit: base.unit || source.unit,
    mealBasis: base.mealBasis || source.mealBasis,
    taxIncluded: base.taxIncluded || source.taxIncluded,
    doubleTwin: base.doubleTwin || (useSourceRooms ? source.doubleTwin : ""),
    single: base.single || (useSourceRooms ? source.single : ""),
    triple: base.triple || (useSourceRooms ? source.triple : ""),
    extraBed: base.extraBed || source.extraBed,
    halfBoard: fillCharge("halfBoard"),
    beverages: fillCharge("beverages"),
    cityTaxIncluded: base.cityTaxIncluded || (!cityTax.amount && !/\binsurance\b/i.test(terms.cityTax) && source.cityTaxIncluded),
    cityTax: base.cityTaxIncluded ? base.cityTax : cityTax,
    porterage: fillCharge("porterage"),
  };
}
