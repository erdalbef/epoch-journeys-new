-- Pending signed events received before providerMessageId is saved.
CREATE TABLE "EpochSupplierWebhookInbox" (
  "id" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EpochSupplierWebhookInbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EpochSupplierWebhookInbox_providerMessageId_createdAt_idx"
  ON "EpochSupplierWebhookInbox"("providerMessageId", "createdAt");
