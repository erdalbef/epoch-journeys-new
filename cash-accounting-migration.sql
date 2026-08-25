-- CreateEnum
CREATE TYPE "CashTransactionDirection" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CashTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "accountingPeriodId" TEXT NOT NULL,
    "createdById" TEXT,
    "direction" "CashTransactionDirection" NOT NULL,
    "status" "CashTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "counterparty" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "supplierId" TEXT,
    "bookingId" TEXT,
    "tourId" TEXT,
    "departureDateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashTransaction_accountingPeriodId_idx" ON "CashTransaction"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "CashTransaction_bookingId_idx" ON "CashTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "CashTransaction_createdById_idx" ON "CashTransaction"("createdById");

-- CreateIndex
CREATE INDEX "CashTransaction_departureDateId_idx" ON "CashTransaction"("departureDateId");

-- CreateIndex
CREATE INDEX "CashTransaction_direction_idx" ON "CashTransaction"("direction");

-- CreateIndex
CREATE INDEX "CashTransaction_status_idx" ON "CashTransaction"("status");

-- CreateIndex
CREATE INDEX "CashTransaction_supplierId_idx" ON "CashTransaction"("supplierId");

-- CreateIndex
CREATE INDEX "CashTransaction_tourId_idx" ON "CashTransaction"("tourId");

-- CreateIndex
CREATE INDEX "CashTransaction_transactionDate_idx" ON "CashTransaction"("transactionDate");

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_departureDateId_fkey" FOREIGN KEY ("departureDateId") REFERENCES "DepartureDate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
