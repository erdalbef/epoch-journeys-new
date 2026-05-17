type PaxPricingRow = {
  paxCount: number;
  singlePrice: number;
  doubleTwinPrice: number;
  triplePrice: number;
};

type QuoteBuilderSummary = {
  agentId?: string | null;
  agentCompany?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;
  paxPricingRows?: PaxPricingRow[];
};

type QuoteWithRelations = {
  quoteNumber: number;
  quoteReference: string | null;
  title: string | null;
  clientDocumentTitle: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  currency: string;
  validUntil: Date | null;
  clientSinglePrice: number | null;
  clientDoubleTwinPrice: number | null;
  clientTriplePrice: number | null;
  clientIncludes: string | null;
  clientExcludes: string | null;
  paymentPolicy: string | null;
  cancellationPolicy: string | null;
  clientOfferNotes: string | null;
  termsAndNotes: string | null;
  quoteBuilderSummary: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuoteBuilderSummary(
  value: unknown
): value is QuoteBuilderSummary {
  return isObject(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function buildAgentClientQuotePdfData(quote: QuoteWithRelations) {
  const summary: QuoteBuilderSummary | null = isQuoteBuilderSummary(
    quote.quoteBuilderSummary
  )
    ? quote.quoteBuilderSummary
    : null;

  const paxPricingRows = Array.isArray(summary?.paxPricingRows)
    ? summary.paxPricingRows
    : [];

  return {
    quoteNumber: quote.quoteNumber,
    quoteReference: quote.quoteReference,
    title: quote.title,
    clientDocumentTitle: quote.clientDocumentTitle,
    recipientName: quote.recipientName,
    recipientEmail: quote.recipientEmail,
    currency: quote.currency,
    validUntil: quote.validUntil,

    clientSinglePrice: quote.clientSinglePrice,
    clientDoubleTwinPrice: quote.clientDoubleTwinPrice,
    clientTriplePrice: quote.clientTriplePrice,

    clientIncludes: quote.clientIncludes,
    clientExcludes: quote.clientExcludes,
    paymentPolicy: quote.paymentPolicy,
    cancellationPolicy: quote.cancellationPolicy,
    clientOfferNotes: quote.clientOfferNotes,
    termsAndNotes: quote.termsAndNotes,

    agencyName: summary?.agentCompany?.trim() || "Travel Agency",
    contactName: null,
    contactEmail: quote.recipientEmail?.trim() || null,
    contactPhone: null,
    contactWebsite: null,
    agencyAddress: null,
    logoUrl: null,
    heroImageUrl: null,

    startDate: summary?.startDate || null,
    endDate: summary?.endDate || null,
    totalPassengers: toNumber(summary?.totalPassengers),
    freePassengers: toNumber(summary?.freePassengers),
    payingPassengers: toNumber(summary?.payingPassengers),

    paxPricingRows: paxPricingRows.map((row) => ({
      paxCount: toNumber(row.paxCount),
      singlePrice: toNumber(row.singlePrice),
      doubleTwinPrice: toNumber(row.doubleTwinPrice),
      triplePrice: toNumber(row.triplePrice),
    })),
  };
}