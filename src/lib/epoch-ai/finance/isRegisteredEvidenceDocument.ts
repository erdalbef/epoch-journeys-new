import { db } from "@/lib/db";

export async function isRegisteredEvidenceDocument(
  documentId: string,
): Promise<boolean> {
  if (process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION !== "enabled") {
    return false;
  }

  if (!documentId.trim()) {
    throw new Error("Document ID is required.");
  }

  // Propagate database errors: never assume a failed lookup
  // means a document is safe to change.
  const count = await db.supplierCommercialEvidence.count({
    where: {
      OR: [
        { sourceDocumentId: documentId },
        { acceptanceDocumentId: documentId },
      ],
    },
  });

  return count > 0;
}