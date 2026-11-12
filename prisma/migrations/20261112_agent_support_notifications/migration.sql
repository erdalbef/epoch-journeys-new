CREATE TABLE IF NOT EXISTS "EpochAgentAlert" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EpochAgentAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EpochAgentAlert_eventKey_key"
ON "EpochAgentAlert" ("eventKey");

CREATE INDEX IF NOT EXISTS "EpochAgentAlert_agent_unread_idx"
ON "EpochAgentAlert" ("agentId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "EpochAgentAlert_ticket_idx"
ON "EpochAgentAlert" ("ticketId");
