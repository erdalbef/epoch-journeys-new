import { z } from "zod";

const money = z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/);
const iso = z.string().regex(/^[A-Z]{3}$/);
const evidence = z.string().trim().min(3).max(500);

const line = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().positive().max(100000).nullable(),
  unitPrice: money.nullable(),
  currency: iso.nullable(),
  evidence,
}).strict();

export const commercialTermsExtractionSchema = z.object({
  agreement: z.object({
    supplier: z.string().max(200).nullable(),
    service: z.string().max(300).nullable(),
    currency: iso.nullable(),
    unitPrice: money.nullable(),
    unit: z.string().max(100).nullable(),
    breakfastIncluded: z.boolean().nullable(),
    complimentaryPlaces: z.number().int().nonnegative().max(10000).nullable(),
    cancellationDeadline: z.string().max(200).nullable(),
    evidence,
  }).strict(),
  invoice: z.object({
    supplier: z.string().max(200).nullable(),
    service: z.string().max(300).nullable(),
    currency: iso.nullable(),
    unitPrice: money.nullable(),
    unit: z.string().max(100).nullable(),
    breakfastChargedSeparately: z.boolean().nullable(),
    complimentaryCreditShown: z.boolean().nullable(),
    cancellationTerms: z.string().max(200).nullable(),
    evidence,
    lines: z.array(line).max(30),
  }).strict(),
}).strict();

export type CommercialTermsExtraction = z.infer<typeof commercialTermsExtractionSchema>;
export type TermsFinding = {
  code: string;
  severity: "INFO" | "WARNING";
  message: string;
  agreementEvidence: string | null;
  invoiceEvidence: string | null;
  estimatedDifference: string | null;
};

function cents(text: string): bigint {
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function format(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}
function normalized(value: string | null): string | null {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || null;
}

// Conservative deterministic checks: never infer quantities, FX rates,
// agreement acceptance, tax basis, or document applicability.
export function compareCommercialTerms(input: unknown) {
  const parsed = commercialTermsExtractionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      verificationStatus: "INSUFFICIENT_EVIDENCE" as const,
      fullyVerified: false as const,
      findings: [{ code: "EXTRACTION_INVALID", severity: "WARNING" as const,
        message: "AI-extracted commercial terms failed validation; human review required.",
        agreementEvidence: null, invoiceEvidence: null, estimatedDifference: null }],
    };
  }
  const { agreement: a, invoice: i } = parsed.data;
  const findings: TermsFinding[] = [];
  const add = (code: string, severity: TermsFinding["severity"], message: string,
    difference: string | null = null) => findings.push({
      code, severity, message, estimatedDifference: difference,
      agreementEvidence: a.evidence, invoiceEvidence: i.evidence,
    });

  const supplierMatches = normalized(a.supplier) !== null && normalized(a.supplier) === normalized(i.supplier);
  if (normalized(a.supplier) && normalized(i.supplier) && !supplierMatches) {
    add("SUPPLIER_NAME_REVIEW", "WARNING", "Supplier names differ; verify document identity before comparing terms.");
  }
  const serviceMatches = normalized(a.service) !== null && normalized(a.service) === normalized(i.service);
  const unitMatches = normalized(a.unit) !== null && normalized(a.unit) === normalized(i.unit);
  if (a.unitPrice && i.unitPrice) {
    if (a.currency && i.currency && a.currency !== i.currency) {
      add("CURRENCY_MISMATCH", "WARNING", "Agreement and invoice prices use different currencies; no FX conversion was attempted.");
    } else if (!a.currency || !i.currency || !supplierMatches || !serviceMatches || !unitMatches) {
      add("PRICE_BASIS_UNVERIFIED", "INFO", "Confirm supplier identity, service, unit, and currency before comparing unit prices.");
    } else {
      const difference = cents(i.unitPrice) - cents(a.unitPrice);
      if (difference > 0n) add("UNIT_PRICE_OVERCHARGE_POSSIBLE", "WARNING",
        `Invoice unit price exceeds agreement by ${format(difference)} ${a.currency} per ${a.unit}.`, format(difference));
      if (difference < 0n) add("UNIT_PRICE_LOWER", "INFO",
        `Invoice unit price is lower by ${format(-difference)} ${a.currency} per ${a.unit}.`, format(difference));
    }
  } else {
    add("UNIT_PRICE_MISSING", "INFO", "An evidenced unit price is missing from one or both documents.");
  }
  if (a.breakfastIncluded === true && i.breakfastChargedSeparately === true) {
    add("POSSIBLE_DUPLICATE_BREAKFAST_CHARGE", "WARNING", "Agreement includes breakfast but invoice appears to charge it separately.");
  }
  if (a.complimentaryPlaces !== null && a.complimentaryPlaces > 0 && i.complimentaryCreditShown === false) {
    add("COMPLIMENTARY_BENEFIT_REVIEW", "WARNING", "Agreement contains complimentary benefits but the invoice does not explicitly show the credit; eligibility must be checked.");
  }
  if (a.cancellationDeadline && i.cancellationTerms && normalized(a.cancellationDeadline) !== normalized(i.cancellationTerms)) {
    add("CANCELLATION_TERMS_REVIEW", "INFO", "Cancellation wording differs; dates and applicability require human review.");
  }
  if (findings.length === 0) {
    add("NO_OBVIOUS_CONFLICT_EXTRACTED", "INFO", "No direct conflict was identified in the extracted fields; this does not establish compliance.");
  }
  return { verificationStatus: "PRELIMINARY" as const, fullyVerified: false as const, findings };
}
