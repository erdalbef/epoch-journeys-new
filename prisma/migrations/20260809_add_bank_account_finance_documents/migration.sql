ALTER TABLE "FinanceDocument"
ADD COLUMN "bankAccountId" TEXT;

CREATE INDEX "FinanceDocument_bankAccountId_idx"
ON "FinanceDocument"("bankAccountId");

ALTER TABLE "FinanceDocument"
ADD CONSTRAINT "FinanceDocument_bankAccountId_fkey"
FOREIGN KEY ("bankAccountId")
REFERENCES "BankAccount"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;