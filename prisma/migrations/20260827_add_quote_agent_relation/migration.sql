ALTER TABLE "Quote"
ADD COLUMN "agentId" TEXT;

CREATE INDEX "Quote_agentId_idx"
ON "Quote"("agentId");

ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_agentId_fkey"
FOREIGN KEY ("agentId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;