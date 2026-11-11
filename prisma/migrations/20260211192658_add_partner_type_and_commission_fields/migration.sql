-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('TRAVEL_AGENT', 'GROUP_LEADER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "fixedPayoutPerPax" DOUBLE PRECISION,
ADD COLUMN     "partnerType" "PartnerType" NOT NULL DEFAULT 'TRAVEL_AGENT';
