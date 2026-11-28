import { z } from "zod";
import { nightlyUnits, offerChargeFields, supplementaryUnits } from "./hotelOfferRateDraft";

const amount = /^\d{1,9}(?:\.\d{1,2})?$/;
const fields: Record<string, { values?: readonly string[]; units?: readonly string[] }> = {
  currency: {},
  unit: { values: nightlyUnits },
  mealBasis: { values: ["BB", "HB"] },
  taxIncluded: { values: ["yes", "no"] },
  cityTaxIncluded: { values: ["yes", "no"] },
  doubleTwin: {},
  single: {},
  triple: {},
  extraBed: {},
  ...Object.fromEntries(Object.keys(offerChargeFields).map(key => [key, {
    units: key === "cityTax" ? nightlyUnits : supplementaryUnits,
  }])),
};

const structuredField = z.object({
  value: z.string().trim().max(40),
  source: z.string().trim().max(1000),
}).strict();

const structuredCharge = structuredField.extend({
  unit: z.union([z.literal(""), z.enum(supplementaryUnits)]),
}).strict();

const hotelOfferRateExtraction = z.object({
  currency: structuredField,
  unit: structuredField,
  mealBasis: structuredField,
  taxIncluded: structuredField,
  cityTaxIncluded: structuredField,
  doubleTwin: structuredField,
  single: structuredField,
  triple: structuredField,
  extraBed: structuredField,
  halfBoard: structuredCharge,
  beverages: structuredCharge,
  cityTax: structuredCharge,
  porterage: structuredCharge,
}).strict();

export const hotelOfferRateExtractionFormat = {
  type: "json_schema",
  name: "hotel_offer_rate_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: Object.keys(fields),
    properties: Object.fromEntries(Object.entries(fields).map(([key, field]) => {
      const units = field.units;
      return [key, {
        type: "object",
        additionalProperties: false,
        required: units ? ["value", "source", "unit"] : ["value", "source"],
        properties: {
          value: field.values ? { type: "string", enum: ["", ...field.values] } : { type: "string" },
          source: { type: "string" },
          ...(units ? {unit: { type: "string", enum: ["", ...units] }} : {}),
        },
      }];
    })),
  },
};

const normalizeExcerpt = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();

export function readHotelOfferRateExtraction(input: unknown, textSources?: readonly string[]) {
  const extraction = hotelOfferRateExtraction.parse(input);
  const normalizedSources = textSources?.map(normalizeExcerpt);
  const sources = Object.fromEntries(Object.entries(extraction).map(([key, {source}]) => [
    key, !normalizedSources || normalizedSources.some(text => text.includes(normalizeExcerpt(source))) ? source : "",
  ]));

  const quoted = <K extends keyof typeof extraction>(key: K) => {
    const field = extraction[key];
    return sources[key] ? field.value : "";
  };
  const quotedAmount = (key: keyof typeof extraction) => {
    const value = quoted(key);
    return amount.test(value) && Number(value) > 0 ? value : "";
  };

  const currency = /^[A-Z]{3}$/.test(quoted("currency")) ? quoted("currency") : "";
  const roomUnit = quoted("unit");
  const mealBasis = quoted("mealBasis");
  const taxIncluded = quoted("taxIncluded");
  const hasCombinedCharge = /\binsurance\b/i.test(`${sources.cityTax} ${sources.cityTaxIncluded}`);
  const cityTax = hasCombinedCharge ? "" : quotedAmount("cityTax");
  const charge = (key: keyof typeof offerChargeFields) => ({
    amount: currency ? quotedAmount(key) : "",
    unit: currency && quotedAmount(key) ? extraction[key].unit : "",
  });
  return {
    draft: {
      currency,
      unit: nightlyUnits.find(unit => unit === roomUnit) ?? "",
      mealBasis: mealBasis === "BB" || mealBasis === "HB" ? mealBasis : "",
      taxIncluded: taxIncluded === "yes" || taxIncluded === "no" ? taxIncluded : "",
      doubleTwin: currency ? quotedAmount("doubleTwin") : "",
      single: currency ? quotedAmount("single") : "",
      triple: currency ? quotedAmount("triple") : "",
      extraBed: currency ? quotedAmount("extraBed") : "",
      halfBoard: charge("halfBoard"),
      beverages: charge("beverages"),
      cityTaxIncluded: !hasCombinedCharge && !cityTax && quoted("cityTaxIncluded") === "yes",
      cityTax: { amount: currency ? cityTax : "", unit: currency && cityTax
        ? nightlyUnits.find(unit => unit === extraction.cityTax.unit) ?? "" : "" },
      porterage: charge("porterage"),
    },
    sources,
  };
}
