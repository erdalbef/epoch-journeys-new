-- ============================================================
-- BANK RECONCILIATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. Reconciliation status enum
-- ------------------------------------------------------------

CREATE TYPE "BankReconciliationStatus" AS ENUM (
  'DRAFT',
  'IN_PROGRESS',
  'RECONCILED',
  'LOCKED'
);

-- ------------------------------------------------------------
-- 2. Bank reconciliation header
-- ------------------------------------------------------------

CREATE TABLE "BankReconciliation" (
  "id" TEXT NOT NULL,

  "bankAccountId" TEXT NOT NULL,
  "createdById" TEXT,

  "statementDate" TIMESTAMP(3) NOT NULL,

  "statementOpeningBalance" DECIMAL(12,2) NOT NULL,
  "statementClosingBalance" DECIMAL(12,2) NOT NULL,

  "ledgerOpeningBalance" DECIMAL(12,2) NOT NULL,
  "ledgerClosingBalance" DECIMAL(12,2) NOT NULL,

  "difference" DECIMAL(12,2) NOT NULL,

  "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',

  "reconciledAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),

  "notes" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankReconciliation_pkey"
    PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- 3. BankTransaction reconciliation fields
-- ------------------------------------------------------------

ALTER TABLE "BankTransaction"
ADD COLUMN "reconciliationId" TEXT;

ALTER TABLE "BankTransaction"
ADD COLUMN "reconciledAt" TIMESTAMP(3);

-- ------------------------------------------------------------
-- 4. Reconciliation indexes
-- ------------------------------------------------------------

CREATE INDEX "BankReconciliation_bankAccountId_idx"
ON "BankReconciliation"("bankAccountId");

CREATE INDEX "BankReconciliation_createdById_idx"
ON "BankReconciliation"("createdById");

CREATE INDEX "BankReconciliation_statementDate_idx"
ON "BankReconciliation"("statementDate");

CREATE INDEX "BankReconciliation_status_idx"
ON "BankReconciliation"("status");

CREATE INDEX "BankReconciliation_createdAt_idx"
ON "BankReconciliation"("createdAt");

CREATE INDEX "BankTransaction_reconciliationId_idx"
ON "BankTransaction"("reconciliationId");

-- ------------------------------------------------------------
-- 5. Foreign keys
-- ------------------------------------------------------------

ALTER TABLE "BankReconciliation"
ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey"
FOREIGN KEY ("bankAccountId")
REFERENCES "BankAccount"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "BankReconciliation"
ADD CONSTRAINT "BankReconciliation_createdById_fkey"
FOREIGN KEY ("createdById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
ADD CONSTRAINT "BankTransaction_reconciliationId_fkey"
FOREIGN KEY ("reconciliationId")
REFERENCES "BankReconciliation"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;