-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'REVIEW', 'READY', 'SUBMITTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountingCategory" AS ENUM ('BANK_STATEMENTS', 'SALES_INCOME', 'EXPENSES_PURCHASES', 'CASH', 'EMPLOYEES_ACCOUNTABLE_PERSONS', 'OWNER_PERSONAL_PAYMENTS', 'OTHER_DOCUMENTS', 'TRIP_GROUP_DOCUMENTATION');

-- AlterTable
ALTER TABLE "BankStatement" ADD COLUMN     "accountingPeriodId" TEXT;

-- AlterTable
ALTER TABLE "FinanceDocument" ADD COLUMN     "accountingCategory" "AccountingCategory",
ADD COLUMN     "accountingPeriodId" TEXT,
ADD COLUMN     "accountingSubcategory" TEXT;

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_year_idx" ON "AccountingPeriod"("year");

-- CreateIndex
CREATE INDEX "AccountingPeriod_month_idx" ON "AccountingPeriod"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_year_month_key" ON "AccountingPeriod"("year", "month");

-- CreateIndex
CREATE INDEX "BankStatement_accountingPeriodId_idx" ON "BankStatement"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "FinanceDocument_accountingPeriodId_idx" ON "FinanceDocument"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "FinanceDocument_accountingCategory_idx" ON "FinanceDocument"("accountingCategory");

-- AddForeignKey
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
