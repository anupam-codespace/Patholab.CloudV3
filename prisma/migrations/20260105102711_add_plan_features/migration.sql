-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false;
