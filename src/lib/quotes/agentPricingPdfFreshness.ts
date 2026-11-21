/** Safe to import from client and server; never exposes pricing data. */
export function isAgentPricingPdfStale(
  summary: unknown,
  pdfGeneratedAt: Date | string | null | undefined,
  hasSavedPdf: boolean
): boolean {
  if (!hasSavedPdf || !summary || typeof summary !== "object" || Array.isArray(summary)) return false;
  const raw = (summary as Record<string, unknown>).flexibleGroupPricing;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const pricing = raw as Record<string, unknown>;
  const timestamp = typeof pricing.changedAt === "string"
    ? pricing.changedAt
    : typeof pricing.approvedAt === "string" ? pricing.approvedAt : null;
  if (!timestamp) return false;
  const changed = new Date(timestamp).getTime();
  if (!Number.isFinite(changed)) return false;
  const generated = pdfGeneratedAt ? new Date(pdfGeneratedAt).getTime() : 0;
  return !Number.isFinite(generated) || generated < changed;
}
