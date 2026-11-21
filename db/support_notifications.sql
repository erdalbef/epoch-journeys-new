-- Run once on PostgreSQL using Prisma db execute after backing up the database.
CREATE TABLE IF NOT EXISTS "EpochSupportReply" (
 "id" TEXT PRIMARY KEY,
 "ticketId" TEXT NOT NULL,
 "authorRole" TEXT NOT NULL,
 "authorId" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "emailDelivered" BOOLEAN NOT NULL DEFAULT FALSE,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "EpochSupportReply_ticketId_createdAt_idx" ON "EpochSupportReply"("ticketId","createdAt");
CREATE TABLE IF NOT EXISTS "EpochAdminAlert" (
 "id" TEXT PRIMARY KEY,
 "eventKey" TEXT NOT NULL UNIQUE,
 "title" TEXT NOT NULL,
 "description" TEXT NOT NULL,
 "href" TEXT NOT NULL,
 "readAt" TIMESTAMPTZ,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "EpochAdminAlert_unread_idx" ON "EpochAdminAlert"("readAt","createdAt");
