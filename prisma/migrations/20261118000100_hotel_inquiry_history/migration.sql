-- Additive inquiry history; no mail sending or existing record modifications.
CREATE TABLE "HotelInquiry" (
 "id" TEXT NOT NULL, "tourId" TEXT NOT NULL, "supplierId" TEXT NOT NULL,
 "destination" TEXT NOT NULL, "checkIn" TEXT NOT NULL, "checkOut" TEXT NOT NULL,
 "rooms" INTEGER NOT NULL, "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL,
 "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
 "approvedBy" TEXT, "approvedAt" TIMESTAMP(3), "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "HotelInquiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HotelInquiry_tourId_createdAt_idx" ON "HotelInquiry"("tourId", "createdAt");
CREATE INDEX "HotelInquiry_supplierId_createdAt_idx" ON "HotelInquiry"("supplierId", "createdAt");
CREATE INDEX "HotelInquiry_status_idx" ON "HotelInquiry"("status");
ALTER TABLE "HotelInquiry" ADD CONSTRAINT "HotelInquiry_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelInquiry" ADD CONSTRAINT "HotelInquiry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
