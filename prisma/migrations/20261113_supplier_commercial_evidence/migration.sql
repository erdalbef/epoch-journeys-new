-- CreateEnum
CREATE TYPE "CommercialEvidenceSourceType" AS ENUM ('FORMAL_CONTRACT', 'EMAIL_BODY', 'QUOTATION_ATTACHMENT');

-- CreateEnum
CREATE TYPE "CommercialEvidenceAcceptanceStatus" AS ENUM ('NOT_ESTABLISHED', 'RECORDED_ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CommercialEvidenceReviewStatus" AS ENUM ('NOT_VERIFIED', 'REVIEW_PENDING', 'ACCEPTANCE_ESTABLISHED', 'TERMS_VERIFIED', 'DISPUTED');

-- CreateTable
CREATE TABLE "SupplierCommercialEvidence" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "payableId" TEXT,
    "contractId" TEXT,
    "sourceType" "CommercialEvidenceSourceType" NOT NULL,
    "sourceDocumentId" TEXT,
    "sourceReference" TEXT NOT NULL,
    "sourceDate" TIMESTAMP(3),
    "sourceMessageId" TEXT,
    "sourceSender" TEXT,
    "sourceRecipient" TEXT,
    "sourceSubject" TEXT,
    "acceptanceStatus" "CommercialEvidenceAcceptanceStatus" NOT NULL DEFAULT 'NOT_ESTABLISHED',
    "acceptanceReference" TEXT,
    "acceptanceDocumentId" TEXT,
    "acceptanceMessageId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "reviewStatus" "CommercialEvidenceReviewStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousEvidenceId" TEXT,
    "scopeDescription" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "currency" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCommercialEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCommercialEvidenceEvent" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCommercialEvidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_supplierId_idx" ON "SupplierCommercialEvidence"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_payableId_idx" ON "SupplierCommercialEvidence"("payableId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_contractId_idx" ON "SupplierCommercialEvidence"("contractId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_sourceDocumentId_idx" ON "SupplierCommercialEvidence"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_acceptanceDocumentId_idx" ON "SupplierCommercialEvidence"("acceptanceDocumentId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_acceptanceStatus_idx" ON "SupplierCommercialEvidence"("acceptanceStatus");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_reviewStatus_idx" ON "SupplierCommercialEvidence"("reviewStatus");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_previousEvidenceId_idx" ON "SupplierCommercialEvidence"("previousEvidenceId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_recordedById_idx" ON "SupplierCommercialEvidence"("recordedById");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidence_reviewedById_idx" ON "SupplierCommercialEvidence"("reviewedById");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidenceEvent_evidenceId_createdAt_idx" ON "SupplierCommercialEvidenceEvent"("evidenceId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidenceEvent_actorId_idx" ON "SupplierCommercialEvidenceEvent"("actorId");

-- CreateIndex
CREATE INDEX "SupplierCommercialEvidenceEvent_eventType_idx" ON "SupplierCommercialEvidenceEvent"("eventType");

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "SupplierPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SupplierContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "FinanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_acceptanceDocumentId_fkey" FOREIGN KEY ("acceptanceDocumentId") REFERENCES "FinanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidence" ADD CONSTRAINT "SupplierCommercialEvidence_previousEvidenceId_fkey" FOREIGN KEY ("previousEvidenceId") REFERENCES "SupplierCommercialEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidenceEvent" ADD CONSTRAINT "SupplierCommercialEvidenceEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "SupplierCommercialEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCommercialEvidenceEvent" ADD CONSTRAINT "SupplierCommercialEvidenceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Protect the commercial evidence audit history.
-- Events are append-only: no UPDATE, DELETE, or TRUNCATE.

CREATE FUNCTION prevent_commercial_evidence_event_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Commercial evidence audit events are append-only';
END;
$$;

CREATE TRIGGER commercial_evidence_event_immutable
BEFORE UPDATE OR DELETE
ON "SupplierCommercialEvidenceEvent"
FOR EACH ROW
EXECUTE FUNCTION prevent_commercial_evidence_event_changes();

CREATE TRIGGER commercial_evidence_event_no_truncate
BEFORE TRUNCATE
ON "SupplierCommercialEvidenceEvent"
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_commercial_evidence_event_changes();
