ALTER TABLE "SupplierCommercialEvidence"
    ADD COLUMN "hotelInquiryId" TEXT,
    ADD COLUMN "sourceBody" TEXT,
    ADD COLUMN "sourceFingerprint" TEXT,
    ADD COLUMN "reviewedTerms" JSONB,
    ADD CONSTRAINT "SupplierCommercialEvidence_hotelInquiryId_fkey"
      FOREIGN KEY ("hotelInquiryId") REFERENCES "HotelInquiry"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SupplierCommercialEvidence_hotel_offer_key"
    ON "SupplierCommercialEvidence"("hotelInquiryId", "sourceFingerprint");

CREATE UNIQUE INDEX "SupplierCommercialEvidence_hotel_version_key"
    ON "SupplierCommercialEvidence"("hotelInquiryId", "version");
