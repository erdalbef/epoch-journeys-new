-- Epoch Journeys Support and Notification System
-- Preserves existing tables and data.
-- No DROP or DELETE operations.

ALTER TABLE "SupportMessage"
  ADD COLUMN IF NOT EXISTS "agentArchivedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "adminArchivedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS
  "SupportMessage_agentArchive_idx"
  ON "SupportMessage" ("userId", "agentArchivedAt");

CREATE INDEX IF NOT EXISTS
  "SupportMessage_adminArchive_idx"
  ON "SupportMessage" ("adminArchivedAt");
CREATE TABLE IF NOT EXISTS "EpochAdminAlert" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EpochAdminAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "EpochAdminAlert_eventKey_key"
  ON "EpochAdminAlert" ("eventKey");

CREATE INDEX IF NOT EXISTS
  "EpochAdminAlert_unread_idx"
  ON "EpochAdminAlert" ("readAt", "createdAt");

CREATE TABLE IF NOT EXISTS "EpochSupportReply" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "emailDelivered" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EpochSupportReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS
  "EpochSupportReply_ticketId_createdAt_idx"
  ON "EpochSupportReply" ("ticketId", "createdAt");

CREATE TABLE IF NOT EXISTS "EpochEmailOutbox" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "providerMessageId" TEXT,
  "nextAttemptAt" TIMESTAMPTZ,
  "leaseExpiresAt" TIMESTAMPTZ,
  "lastAttemptAt" TIMESTAMPTZ,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EpochEmailOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EpochEmailOutbox_status_check"
    CHECK ("status" IN (
      'PENDING',
      'SENDING',
      'ACCEPTED',
      'FAILED',
      'UNCERTAIN'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "EpochEmailOutbox_eventKey_key"
  ON "EpochEmailOutbox" ("eventKey");

CREATE INDEX IF NOT EXISTS
  "EpochEmailOutbox_status_retry_idx"
  ON "EpochEmailOutbox" ("status", "nextAttemptAt");
