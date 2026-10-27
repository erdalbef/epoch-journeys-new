import { db } from "@/lib/db";

/**
 * Quotation builder data is a saved JSON snapshot, not a foreign-key reference.
 * A deletion must not remove the master record if a draft or a commercial quote
 * still refers to its ID. Read batches to avoid materializing all quotes at once.
 */
export async function isReferencedBySavedQuotation(recordId: string): Promise<boolean> {
  let cursor: string | undefined;
  for (;;) {
    const batch = await db.quote.findMany({
      select: { id: true, quoteBuilderSummary: true },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.some((quote) => JSON.stringify(quote.quoteBuilderSummary ?? {}).includes(`"${recordId}"`))) return true;
    if (batch.length < 100) return false;
    cursor = batch[batch.length - 1].id;
  }
}
