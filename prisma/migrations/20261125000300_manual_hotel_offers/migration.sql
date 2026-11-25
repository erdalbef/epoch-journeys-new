ALTER TABLE "SupplierCommercialEvidence"
    ADD COLUMN "manualHotelTourId" TEXT,
    ADD COLUMN "manualHotelStayKey" TEXT,
    ADD CONSTRAINT "SupplierCommercialEvidence_manualHotelTourId_fkey"
      FOREIGN KEY ("manualHotelTourId") REFERENCES "Tour"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "SupplierCommercialEvidence_manual_scope_check" CHECK (
      ("manualHotelTourId" IS NULL AND "manualHotelStayKey" IS NULL)
      OR ("manualHotelTourId" IS NOT NULL AND "manualHotelStayKey" IS NOT NULL AND "hotelInquiryId" IS NULL)
    );

CREATE UNIQUE INDEX "SupplierCommercialEvidence_manual_offer_key"
    ON "SupplierCommercialEvidence"("manualHotelTourId", "supplierId", "manualHotelStayKey", "sourceFingerprint");

CREATE UNIQUE INDEX "SupplierCommercialEvidence_manual_version_key"
    ON "SupplierCommercialEvidence"("manualHotelTourId", "supplierId", "manualHotelStayKey", "version");
