import { db } from "@/lib/db";
import { isServiceConsistencyConfirmed, reviewQuoteServiceConsistency, type ServiceConsistencyResult } from "@/lib/quotes/serviceConsistency";

type SavedQuote = {
  tourId?: string | null;
  clientIncludes?: string | null;
  clientExcludes?: string | null;
  quoteBuilderSummary?: unknown;
};

/** Always recompute against the currently saved Tour Master. Never trust a form checkbox alone. */
export async function checkStoredServiceConsistency(quote: SavedQuote): Promise<{
  confirmed: boolean;
  review: ServiceConsistencyResult;
}> {
  const tour = quote.tourId ? await db.tour.findUnique({
    where: { id: quote.tourId },
    select: { inclusions: true, exclusions: true },
  }) : null;
  const summary = quote.quoteBuilderSummary && typeof quote.quoteBuilderSummary === "object" && !Array.isArray(quote.quoteBuilderSummary)
    ? quote.quoteBuilderSummary as Record<string, unknown> : {};
  const review = reviewQuoteServiceConsistency({
    tourId: quote.tourId,
    tourInclusions: tour?.inclusions.join("\n"),
    tourExclusions: tour?.exclusions.join("\n"),
    briefItinerary: summary.briefItinerary as string | null | undefined,
    includes: quote.clientIncludes,
    excludes: quote.clientExcludes,
    hotels: summary.hotels,
    fixedCostRows: summary.fixedCostRows,
    operationalCostRows: summary.operationalCostRows,
    payingPassengers: summary.payingPassengers,
    freePassengers: summary.freePassengers,
  });
  return {
    confirmed: (!quote.tourId || !!tour) && review.blockers.length === 0 &&
      isServiceConsistencyConfirmed(summary, review.fingerprint),
    review,
  };
}
