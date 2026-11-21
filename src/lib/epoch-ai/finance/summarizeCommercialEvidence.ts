// Registered commercial evidence is metadata, not proof that a quoted
// price was accepted or applied to a particular invoice.
export type RegisteredEvidenceCandidate = {
  id: string;
  payableId: string | null;
  sourceType: string;
  sourceReference: string;
  version: number;
  previousEvidenceId: string | null;
  acceptanceStatus: string;
  reviewStatus: string;
  currency: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
};

export function summarizeCommercialEvidence(
  payableId: string,
  rows: readonly RegisteredEvidenceCandidate[],
  candidateLimitReached: boolean,
) {
  const candidates = rows.map((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    sourceReference: row.sourceReference,
    scope: row.payableId === payableId
      ? ("LINKED_TO_PAYABLE" as const)
      : ("SUPPLIER_WIDE" as const),
    version: row.version,
    previousEvidenceId: row.previousEvidenceId,
    recordedAcceptanceStatus: row.acceptanceStatus,
    recordedReviewStatus: row.reviewStatus,
    currency: row.currency,
    validFrom: row.validFrom?.toISOString() ?? null,
    validTo: row.validTo?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    registeredAt: row.createdAt.toISOString(),
    sourceContentExaminedByThisAudit: false as const,
    applicabilityVerifiedByThisAudit: false as const,
  }));

  return {
    status: "CANDIDATES_ONLY" as const,
    candidateCount: candidates.length,
    supplierWideCount: candidates.filter(
      (candidate) => candidate.scope === "SUPPLIER_WIDE",
    ).length,
    candidateLimitReached,
    candidates,
    acceptanceEstablishedByThisAudit: false as const,
    termsVerifiedByThisAudit: false as const,
    limitations: [
      "Registration and recorded review statuses are not independent evidence verification.",
      "Supplier-wide offers may be unrelated to this invoice.",
      "Source documents and email content have not been examined by this audit.",
      "The accepted version and applicable commercial terms require a separate source review.",
    ],
  };
}
