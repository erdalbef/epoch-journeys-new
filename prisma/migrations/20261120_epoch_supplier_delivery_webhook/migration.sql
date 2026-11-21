-- Stage 3C event audit ledger. Apply only through reviewed Prisma migration deployment.
CREATE TABLE "EpochSupplierDeliveryEvent" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EpochSupplierDeliveryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EpochSupplierDeliveryEvent_outboxId_createdAt_idx" ON "EpochSupplierDeliveryEvent"("outboxId", "createdAt");
CREATE INDEX "EpochSupplierDeliveryEvent_providerMessageId_idx" ON "EpochSupplierDeliveryEvent"("providerMessageId");
