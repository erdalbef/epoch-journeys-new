import { createHash } from "crypto";

export type ApprovedTier = {
  payingPilgrims: number;
  complimentaryPilgrims: number;
  single: number;
  doubleTwin: number;
  triple: number | null;
  note: string;
};
export type FlexiblePricing = {
  enabled: boolean;
  quoteVersion: number;
  fingerprint: string;
  approvedAt: string;
  tiers: ApprovedTier[];
};
export function pricingFingerprint(quote: {
  version: number;
  clientSinglePrice: number | null;
  clientDoubleTwinPrice: number | null;
  clientTriplePrice: number | null;
  quoteBuilderSummary: unknown;
}) {
  const summary = quote.quoteBuilderSummary && typeof quote.quoteBuilderSummary === "object"
    ? quote.quoteBuilderSummary as Record<string, unknown> : {};
  return createHash("sha256").update(JSON.stringify({
    version: quote.version,
    single: quote.clientSinglePrice,
    double: quote.clientDoubleTwinPrice,
    triple: quote.clientTriplePrice,
    paying: summary.payingPassengers,
    comps: summary.freePassengers,
    rows: summary.paxPricingRows,
    complimentarySetup: summary.complimentarySetup,
    pricingMode: summary.pricingMode,
  })).digest("hex");
}
export function getApprovedFlexiblePricing(quote: {
  version: number;
  clientSinglePrice: number | null;
  clientDoubleTwinPrice: number | null;
  clientTriplePrice: number | null;
  quoteBuilderSummary: unknown;
}): FlexiblePricing | null {
  const summary = quote.quoteBuilderSummary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const raw = (summary as Record<string, unknown>).flexibleGroupPricing;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as FlexiblePricing;
  if (p.enabled !== true || p.quoteVersion !== quote.version ||
      p.fingerprint !== pricingFingerprint(quote) || !Array.isArray(p.tiers) || !p.tiers.length) return null;
  return p;
}
