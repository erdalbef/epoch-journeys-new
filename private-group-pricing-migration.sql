-- CreateTable
CREATE TABLE "PrivateGroupPricingPlan" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "title" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minPayingPax" INTEGER,
    "maxPayingPax" INTEGER,
    "focEnabled" BOOLEAN NOT NULL DEFAULT true,
    "focPayingPaxRatio" INTEGER NOT NULL DEFAULT 10,
    "focNotes" TEXT,
    "packageIncludes" TEXT[],
    "packageExcludes" TEXT[],
    "pricingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateGroupPricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateGroupSeason" (
    "id" TEXT NOT NULL,
    "pricingPlanId" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "months" INTEGER[],
    "seasonNote" TEXT,
    "singleSupplement" DECIMAL(12,2),
    "tripleReduction" DECIMAL(12,2),
    "isOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateGroupSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateGroupPriceBand" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "minPayingPax" INTEGER NOT NULL,
    "maxPayingPax" INTEGER,
    "doubleTwinPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateGroupPriceBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateGroupPricingPlan_tourId_idx" ON "PrivateGroupPricingPlan"("tourId");

-- CreateIndex
CREATE INDEX "PrivateGroupPricingPlan_year_idx" ON "PrivateGroupPricingPlan"("year");

-- CreateIndex
CREATE INDEX "PrivateGroupPricingPlan_isActive_idx" ON "PrivateGroupPricingPlan"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateGroupPricingPlan_tourId_year_key" ON "PrivateGroupPricingPlan"("tourId", "year");

-- CreateIndex
CREATE INDEX "PrivateGroupSeason_pricingPlanId_idx" ON "PrivateGroupSeason"("pricingPlanId");

-- CreateIndex
CREATE INDEX "PrivateGroupSeason_season_idx" ON "PrivateGroupSeason"("season");

-- CreateIndex
CREATE INDEX "PrivateGroupSeason_sortOrder_idx" ON "PrivateGroupSeason"("sortOrder");

-- CreateIndex
CREATE INDEX "PrivateGroupPriceBand_seasonId_idx" ON "PrivateGroupPriceBand"("seasonId");

-- CreateIndex
CREATE INDEX "PrivateGroupPriceBand_minPayingPax_idx" ON "PrivateGroupPriceBand"("minPayingPax");

-- CreateIndex
CREATE INDEX "PrivateGroupPriceBand_isActive_idx" ON "PrivateGroupPriceBand"("isActive");

-- CreateIndex
CREATE INDEX "PrivateGroupPriceBand_sortOrder_idx" ON "PrivateGroupPriceBand"("sortOrder");

-- AddForeignKey
ALTER TABLE "PrivateGroupPricingPlan" ADD CONSTRAINT "PrivateGroupPricingPlan_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateGroupSeason" ADD CONSTRAINT "PrivateGroupSeason_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PrivateGroupPricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateGroupPriceBand" ADD CONSTRAINT "PrivateGroupPriceBand_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "PrivateGroupSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
