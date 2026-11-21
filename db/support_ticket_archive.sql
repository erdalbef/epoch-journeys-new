-- Epoch Journeys - Reversible Support Ticket Archiving
-- Preparation only. Do not execute before database backup.

ALTER TABLE "SupportMessage"
ADD COLUMN IF NOT EXISTS "agentArchivedAt" TIMESTAMPTZ;

ALTER TABLE "SupportMessage"
ADD COLUMN IF NOT EXISTS "adminArchivedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "SupportMessage_agentArchive_idx"
ON "SupportMessage" ("userId", "agentArchivedAt");

CREATE INDEX IF NOT EXISTS "SupportMessage_adminArchive_idx"
ON "SupportMessage" ("adminArchivedAt");
