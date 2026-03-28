/*
  Warnings:

  - The values [IN_PROGRESS,NO_SHOW] on the enum `AppointmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PROCESSING,REFUNDED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [URGENT] on the enum `TicketPriority` will be removed. If these variants are still used in the database, this will fail.
  - The values [WAITING_FOR_CUSTOMER] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `ipAddress` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Agency` table. All the data in the column will be lost.
  - You are about to drop the column `appointmentTime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMode` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `maxDiscount` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `minAmount` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `usageLimit` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `Discount` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Doctor` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `abhaAddress` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContact` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyPhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `pincode` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `failureReason` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `razorpaySignature` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Sample` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `Sample` table. All the data in the column will be lost.
  - You are about to drop the column `processedBy` on the `Sample` table. All the data in the column will be lost.
  - You are about to drop the column `quality` on the `Sample` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `Sample` table. All the data in the column will be lost.
  - You are about to drop the column `autoRenew` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodEnd` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodStart` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `razorpaySubscriptionId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndsAt` on the `Subscription` table. All the data in the column will be lost.
  - The `status` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assignedTo` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedAt` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `processingBy` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `referredBy` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `results` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `sampleCollectedBy` on the `Test` table. All the data in the column will be lost.
  - You are about to drop the column `normalRange` on the `TestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `parameters` on the `TestTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `senderName` on the `TicketMessage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `UsageMetric` table. All the data in the column will be lost.
  - You are about to drop the column `patientsCount` on the `UsageMetric` table. All the data in the column will be lost.
  - You are about to drop the column `staffCount` on the `UsageMetric` table. All the data in the column will be lost.
  - You are about to drop the `EmailTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Plan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketAttachment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[razorpaySubId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `grandTotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxableAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTax` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planName` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StockType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'RETURN', 'WASTAGE', 'EXPIRED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EntryMethod" AS ENUM ('MANUAL', 'MACHINE_INTERFACE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('LAB_VISIT', 'HOME_COLLECTION', 'HOSPITAL_PICKUP');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentStatus_new" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus_new" USING ("status"::text::"AppointmentStatus_new");
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "AppointmentStatus_old";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketPriority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" TYPE "TicketPriority_new" USING ("priority"::text::"TicketPriority_new");
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
ALTER TYPE "TicketPriority_new" RENAME TO "TicketPriority";
DROP TYPE "TicketPriority_old";
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
ALTER TABLE "SupportTicket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "SupportTicket" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_ticketId_fkey";

-- DropIndex
DROP INDEX "ActivityLog_createdAt_idx";

-- DropIndex
DROP INDEX "ActivityLog_entity_entityId_idx";

-- DropIndex
DROP INDEX "ActivityLog_userId_idx";

-- DropIndex
DROP INDEX "Agency_userId_idx";

-- DropIndex
DROP INDEX "Appointment_appointmentDate_idx";

-- DropIndex
DROP INDEX "Appointment_patientId_idx";

-- DropIndex
DROP INDEX "Appointment_status_idx";

-- DropIndex
DROP INDEX "Commission_agencyId_idx";

-- DropIndex
DROP INDEX "Commission_doctorId_idx";

-- DropIndex
DROP INDEX "Discount_code_idx";

-- DropIndex
DROP INDEX "Doctor_registrationNo_idx";

-- DropIndex
DROP INDEX "Doctor_userId_idx";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_idx";

-- DropIndex
DROP INDEX "Invoice_labId_idx";

-- DropIndex
DROP INDEX "Invoice_status_idx";

-- DropIndex
DROP INDEX "Lab_isActive_idx";

-- DropIndex
DROP INDEX "LabStaff_isActive_idx";

-- DropIndex
DROP INDEX "LabStaff_userId_idx";

-- DropIndex
DROP INDEX "Notification_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_isRead_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- DropIndex
DROP INDEX "OTP_expiresAt_idx";

-- DropIndex
DROP INDEX "Patient_abhaNumber_idx";

-- DropIndex
DROP INDEX "Patient_email_idx";

-- DropIndex
DROP INDEX "Patient_isActive_idx";

-- DropIndex
DROP INDEX "Patient_labId_idx";

-- DropIndex
DROP INDEX "Payment_createdAt_idx";

-- DropIndex
DROP INDEX "Payment_status_idx";

-- DropIndex
DROP INDEX "Payment_subscriptionId_idx";

-- DropIndex
DROP INDEX "Sample_labId_idx";

-- DropIndex
DROP INDEX "Sample_patientId_idx";

-- DropIndex
DROP INDEX "Sample_testId_idx";

-- DropIndex
DROP INDEX "Subscription_endDate_idx";

-- DropIndex
DROP INDEX "Subscription_labId_idx";

-- DropIndex
DROP INDEX "Subscription_planId_idx";

-- DropIndex
DROP INDEX "Subscription_razorpaySubscriptionId_key";

-- DropIndex
DROP INDEX "Subscription_status_idx";

-- DropIndex
DROP INDEX "SupportTicket_priority_idx";

-- DropIndex
DROP INDEX "SupportTicket_status_idx";

-- DropIndex
DROP INDEX "SupportTicket_ticketNumber_idx";

-- DropIndex
DROP INDEX "SupportTicket_userId_idx";

-- DropIndex
DROP INDEX "Test_agencyId_idx";

-- DropIndex
DROP INDEX "Test_createdAt_idx";

-- DropIndex
DROP INDEX "Test_doctorId_idx";

-- DropIndex
DROP INDEX "Test_labId_idx";

-- DropIndex
DROP INDEX "TestCategory_isActive_idx";

-- DropIndex
DROP INDEX "TestCategory_isGlobal_idx";

-- DropIndex
DROP INDEX "TestCategory_labId_idx";

-- DropIndex
DROP INDEX "TestTemplate_code_idx";

-- DropIndex
DROP INDEX "TestTemplate_isActive_idx";

-- DropIndex
DROP INDEX "TicketMessage_createdAt_idx";

-- DropIndex
DROP INDEX "TicketMessage_ticketId_idx";

-- DropIndex
DROP INDEX "UsageMetric_subscriptionId_idx";

-- DropIndex
DROP INDEX "User_abhaNumber_idx";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "Agency" DROP COLUMN "address";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "appointmentTime",
DROP COLUMN "notes",
DROP COLUMN "purpose",
DROP COLUMN "updatedAt",
ADD COLUMN     "tripId" TEXT;

-- AlterTable
ALTER TABLE "Commission" DROP COLUMN "paymentMode",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "description",
DROP COLUMN "maxDiscount",
DROP COLUMN "minAmount",
DROP COLUMN "updatedAt",
DROP COLUMN "usageCount",
DROP COLUMN "usageLimit",
DROP COLUMN "validFrom";

-- AlterTable
ALTER TABLE "Doctor" DROP COLUMN "address";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "dueDate",
DROP COLUMN "items",
DROP COLUMN "notes",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "tax",
DROP COLUMN "total",
ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "financialYear" TEXT DEFAULT '2024-25',
ADD COLUMN     "grandTotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gstinCustomer" TEXT,
ADD COLUMN     "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isB2B" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMode" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalTax" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "transactionRef" TEXT;

-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "panNumber" TEXT;

-- AlterTable
ALTER TABLE "LabStaff" ADD COLUMN     "customPermissions" JSONB;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "data",
DROP COLUMN "readAt",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "abhaAddress",
DROP COLUMN "city",
DROP COLUMN "emergencyContact",
DROP COLUMN "emergencyPhone",
DROP COLUMN "isActive",
DROP COLUMN "pincode",
DROP COLUMN "state",
ADD COLUMN     "chronicConditions" TEXT[],
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "membershipTier" TEXT NOT NULL DEFAULT 'SILVER',
ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "currency",
DROP COLUMN "failureReason",
DROP COLUMN "invoiceId",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "razorpaySignature",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Sample" DROP COLUMN "notes",
DROP COLUMN "processedAt",
DROP COLUMN "processedBy",
DROP COLUMN "quality",
DROP COLUMN "volume",
ADD COLUMN     "collectionAddress" TEXT,
ADD COLUMN     "collectionLat" DOUBLE PRECISION,
ADD COLUMN     "collectionLng" DOUBLE PRECISION,
ADD COLUMN     "collectionMode" "CollectionMode" NOT NULL DEFAULT 'LAB_VISIT',
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "transitTemperature" TEXT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "autoRenew",
DROP COLUMN "cancelledAt",
DROP COLUMN "currentPeriodEnd",
DROP COLUMN "currentPeriodStart",
DROP COLUMN "planId",
DROP COLUMN "razorpaySubscriptionId",
DROP COLUMN "trialEndsAt",
ADD COLUMN     "planName" TEXT NOT NULL,
ADD COLUMN     "razorpaySubId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "SubStatus" NOT NULL DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "assignedTo",
DROP COLUMN "category",
DROP COLUMN "resolvedAt";

-- AlterTable
ALTER TABLE "Test" DROP COLUMN "instructions",
DROP COLUMN "processingBy",
DROP COLUMN "referredBy",
DROP COLUMN "results",
DROP COLUMN "sampleCollectedBy";

-- AlterTable
ALTER TABLE "TestTemplate" DROP COLUMN "normalRange",
DROP COLUMN "parameters",
ADD COLUMN     "containerType" TEXT,
ADD COLUMN     "referenceData" JSONB,
ADD COLUMN     "volume" TEXT;

-- AlterTable
ALTER TABLE "TicketMessage" DROP COLUMN "senderName";

-- AlterTable
ALTER TABLE "UsageMetric" DROP COLUMN "createdAt",
DROP COLUMN "patientsCount",
DROP COLUMN "staffCount";

-- DropTable
DROP TABLE "EmailTemplate";

-- DropTable
DROP TABLE "Plan";

-- DropTable
DROP TABLE "TicketAttachment";

-- DropEnum
DROP TYPE "BillingCycle";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "LabAnalyzer" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "ipAddress" TEXT,
    "protocol" TEXT,
    "maintenanceDue" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LabAnalyzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "category" TEXT,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "minStockLevel" INTEGER NOT NULL DEFAULT 10,
    "reorderLevel" INTEGER,
    "costPrice" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "StockType" NOT NULL,
    "testId" TEXT,
    "notes" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResultParameter" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "refRangeMin" DOUBLE PRECISION,
    "refRangeMax" DOUBLE PRECISION,
    "refRangeText" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "analyzerId" TEXT,
    "entryMethod" "EntryMethod" NOT NULL DEFAULT 'MANUAL',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestResultParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPrediction" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION,
    "recommendations" JSONB,
    "modelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleLog" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "status" "SampleStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "notes" TEXT,
    "location" TEXT,

    CONSTRAINT "SampleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeCollectionTrip" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "phlebotomistId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startLocation" TEXT,
    "endLocation" TEXT,
    "totalDistance" DOUBLE PRECISION,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeCollectionTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSacCode" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_labId_idx" ON "Supplier"("labId");

-- CreateIndex
CREATE INDEX "InventoryItem_labId_idx" ON "InventoryItem"("labId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_labId_name_batchNumber_key" ON "InventoryItem"("labId", "name", "batchNumber");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE INDEX "TestResultParameter_testId_idx" ON "TestResultParameter"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "AIPrediction_testId_key" ON "AIPrediction"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubId_key" ON "Subscription"("razorpaySubId");

-- AddForeignKey
ALTER TABLE "LabAnalyzer" ADD CONSTRAINT "LabAnalyzer_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResultParameter" ADD CONSTRAINT "TestResultParameter_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResultParameter" ADD CONSTRAINT "TestResultParameter_analyzerId_fkey" FOREIGN KEY ("analyzerId") REFERENCES "LabAnalyzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPrediction" ADD CONSTRAINT "AIPrediction_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleLog" ADD CONSTRAINT "SampleLog_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeCollectionTrip" ADD CONSTRAINT "HomeCollectionTrip_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeCollectionTrip" ADD CONSTRAINT "HomeCollectionTrip_phlebotomistId_fkey" FOREIGN KEY ("phlebotomistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "HomeCollectionTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
