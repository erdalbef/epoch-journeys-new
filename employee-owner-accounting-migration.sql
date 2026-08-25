-- CreateEnum
CREATE TYPE "ExpensePaymentSource" AS ENUM ('COMPANY_BANK', 'EMPLOYEE_PERSONAL', 'OWNER_PERSONAL');

-- CreateEnum
CREATE TYPE "ExpenseReimbursementStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PARTIALLY_REIMBURSED', 'REIMBURSED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentSource" "ExpensePaymentSource" NOT NULL DEFAULT 'COMPANY_BANK',
ADD COLUMN     "reimbursedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reimbursedAt" TIMESTAMP(3),
ADD COLUMN     "reimbursementReference" TEXT,
ADD COLUMN     "reimbursementStatus" "ExpenseReimbursementStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';

-- CreateIndex
CREATE INDEX "Expense_paymentSource_idx" ON "Expense"("paymentSource");

-- CreateIndex
CREATE INDEX "Expense_reimbursementStatus_idx" ON "Expense"("reimbursementStatus");
