/*
  Warnings:

  - A unique constraint covering the columns `[abhaNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[abhaNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'PROCESSING', 'PROCESSED', 'STORED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COMMISSION';
ALTER TYPE "NotificationType" ADD VALUE 'SAMPLE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'DOCTOR';
ALTER TYPE "Role" ADD VALUE 'AGENCY';

-- DropForeignKey
ALTER TABLE "TestCategory" DROP CONSTRAINT "TestCategory_labId_fkey";

-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "defaultAgencyCommission" DOUBLE PRECISION DEFAULT 5,
ADD COLUMN     "defaultDoctorCommission" DOUBLE PRECISION DEFAULT 10,
ADD COLUMN     "footer" TEXT,
ADD COLUMN     "letterhead" TEXT,
ADD COLUMN     "signature" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "abhaAddress" TEXT,
ADD COLUMN     "abhaNumber" TEXT,
ADD COLUMN     "healthId" TEXT;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "referredBy" TEXT;

-- AlterTable
ALTER TABLE "TestCategory" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "labId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TestTemplate" ADD COLUMN     "parameters" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "abhaAddress" TEXT,
ADD COLUMN     "abhaNumber" TEXT;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL DEFAULT 'Patholab',
    "systemLogo" TEXT,
    "systemEmail" TEXT,
    "systemPhone" TEXT,
    "systemAddress" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#8b5cf6',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "enableABDM" BOOLEAN NOT NULL DEFAULT false,
    "abdmClientId" TEXT,
    "abdmClientSecret" TEXT,
    "razorpayKeyId" TEXT,
    "razorpayKeySecret" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT,
    "clinic" TEXT,
    "address" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "address" TEXT,
    "panNumber" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "doctorId" TEXT,
    "agencyId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "CommissionType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMode" TEXT,
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "maxDiscount" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sampleType" TEXT NOT NULL,
    "containerType" TEXT,
    "volume" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "status" "SampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "storageLocation" TEXT,
    "temperature" TEXT,
    "quality" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_registrationNo_key" ON "Doctor"("registrationNo");

-- CreateIndex
CREATE INDEX "Doctor_labId_idx" ON "Doctor"("labId");

-- CreateIndex
CREATE INDEX "Doctor_userId_idx" ON "Doctor"("userId");

-- CreateIndex
CREATE INDEX "Doctor_registrationNo_idx" ON "Doctor"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_userId_key" ON "Agency"("userId");

-- CreateIndex
CREATE INDEX "Agency_labId_idx" ON "Agency"("labId");

-- CreateIndex
CREATE INDEX "Agency_userId_idx" ON "Agency"("userId");

-- CreateIndex
CREATE INDEX "Commission_testId_idx" ON "Commission"("testId");

-- CreateIndex
CREATE INDEX "Commission_doctorId_idx" ON "Commission"("doctorId");

-- CreateIndex
CREATE INDEX "Commission_agencyId_idx" ON "Commission"("agencyId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE INDEX "Discount_labId_idx" ON "Discount"("labId");

-- CreateIndex
CREATE INDEX "Discount_code_idx" ON "Discount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Sample_sampleId_key" ON "Sample"("sampleId");

-- CreateIndex
CREATE INDEX "Sample_labId_idx" ON "Sample"("labId");

-- CreateIndex
CREATE INDEX "Sample_sampleId_idx" ON "Sample"("sampleId");

-- CreateIndex
CREATE INDEX "Sample_testId_idx" ON "Sample"("testId");

-- CreateIndex
CREATE INDEX "Sample_patientId_idx" ON "Sample"("patientId");

-- CreateIndex
CREATE INDEX "Sample_status_idx" ON "Sample"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmailTemplate_name_idx" ON "EmailTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_abhaNumber_key" ON "Patient"("abhaNumber");

-- CreateIndex
CREATE INDEX "Patient_abhaNumber_idx" ON "Patient"("abhaNumber");

-- CreateIndex
CREATE INDEX "Test_doctorId_idx" ON "Test"("doctorId");

-- CreateIndex
CREATE INDEX "Test_agencyId_idx" ON "Test"("agencyId");

-- CreateIndex
CREATE INDEX "TestCategory_isGlobal_idx" ON "TestCategory"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "User_abhaNumber_key" ON "User"("abhaNumber");

-- CreateIndex
CREATE INDEX "User_abhaNumber_idx" ON "User"("abhaNumber");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCategory" ADD CONSTRAINT "TestCategory_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
