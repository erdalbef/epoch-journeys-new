CREATE TABLE "EpochTourDraftSave" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpochTourDraftSave_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EpochTourDraftSave_tourId_key" ON "EpochTourDraftSave"("tourId");
