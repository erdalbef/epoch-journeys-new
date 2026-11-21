import "server-only";

import { db } from "@/lib/db";

const MAX_DOCUMENT_CANDIDATES = 30;

export async function loadSupplierCommercialEvidence(
  payableId: string,
) {
  if (
    typeof payableId !== "string" ||
    !payableId.trim() ||
    payableId.length > 128
  ) {
    throw new Error("Invalid payable ID.");
  }

  const payable = await db.supplierPayable.findUnique({
    where: { id: payableId },
    select: {
      id: true,
      supplierId: true,
      contractId: true,
      rateId: true,
      contract: {
        select: {
          id: true,
          supplierId: true,
          title: true,
          reference: true,
          status: true,
          version: true,
          previousVersionId: true,
          replacedAt: true,
          signedDate: true,
          validFrom: true,
          validTo: true,
          currency: true,
          originalFileName: true,
          documentUrl: true,
        },
      },
      rate: {
        select: {
          id: true,
          supplierId: true,
          name: true,
          currency: true,
          amount: true,
          unit: true,
          validFrom: true,
          validTo: true,
          rateSource: true,
          supplierReference: true,
          lastVerifiedAt: true,
        },
      },
    },
  });

  if (!payable) {
    throw new Error("Supplier payable not found.");
  }

  // Supplier-wide records are only candidates.
  // They must not be treated as accepted terms.
  const documents = await db.financeDocument.findMany({
    where: {
      type: {
        in: ["CONTRACT", "AGREEMENT"],
      },
      OR: [
        { supplierPayableId: payable.id },
        { supplierId: payable.supplierId },
      ],
    },
    select: {
      id: true,
      type: true,
      title: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      documentDate: true,
      createdAt: true,
      supplierId: true,
      supplierPayableId: true,
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: MAX_DOCUMENT_CANDIDATES + 1,
  });

  const linkedContract =
    payable.contract &&
    payable.contract.supplierId === payable.supplierId
      ? payable.contract
      : null;

  const linkedRate =
    payable.rate &&
    payable.rate.supplierId === payable.supplierId
      ? payable.rate
      : null;

  const candidates = documents
    .slice(0, MAX_DOCUMENT_CANDIDATES)
    .map((document) => ({
      id: document.id,
      type: document.type,
      title: document.title,
      fileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      documentDate: document.documentDate?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      scope:
        document.supplierPayableId === payable.id
          ? "LINKED_TO_PAYABLE"
          : "SUPPLIER_WIDE",
      acceptanceStatus: "NOT_ESTABLISHED" as const,
      contentExamined: false,
    }));

  return {
    payableId: payable.id,
    supplierId: payable.supplierId,
    evidenceStatus: "NOT_VERIFIED" as const,
    acceptanceStatus: "NOT_ESTABLISHED" as const,
    contentExamined: false,

    linkedContract: linkedContract
      ? {
          id: linkedContract.id,
          title: linkedContract.title,
          reference: linkedContract.reference,
          status: linkedContract.status,
          version: linkedContract.version,
          previousVersionId: linkedContract.previousVersionId,
          replacedAt:
            linkedContract.replacedAt?.toISOString() ?? null,
          signedDate:
            linkedContract.signedDate?.toISOString() ?? null,
          validFrom:
            linkedContract.validFrom?.toISOString() ?? null,
          validTo:
            linkedContract.validTo?.toISOString() ?? null,
          currency: linkedContract.currency,
          originalFileName: linkedContract.originalFileName,
          hasStoredFile: Boolean(linkedContract.documentUrl),
          acceptanceStatus: "NOT_ESTABLISHED" as const,
          contentExamined: false,
        }
      : null,

    linkedRate: linkedRate
      ? {
          id: linkedRate.id,
          name: linkedRate.name,
          amount: linkedRate.amount.toFixed(2),
          currency: linkedRate.currency,
          unit: linkedRate.unit,
          validFrom: linkedRate.validFrom.toISOString(),
          validTo: linkedRate.validTo.toISOString(),
          rateSource: linkedRate.rateSource,
          supplierReference: linkedRate.supplierReference,
          lastVerifiedAt:
            linkedRate.lastVerifiedAt?.toISOString() ?? null,
          sourceVerifiedByThisAudit: false,
        }
      : null,

    documentCandidates: candidates,
    documentCandidateLimitReached:
      documents.length > MAX_DOCUMENT_CANDIDATES,

    limitations: [
      "Document contents have not been examined.",
      "Supplier acceptance has not been established.",
      "Supplier email offers are not yet included.",
      "Supplier-wide records may be unrelated to this payable.",
      "Only linked contracts and rates are listed.",
      "Other document types may contain relevant offers.",
      "Commercial compliance has not been determined.",
    ],
  };
}