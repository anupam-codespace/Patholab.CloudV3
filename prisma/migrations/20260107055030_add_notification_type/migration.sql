/*
  Warnings:

  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TEST', 'PAYMENT', 'SYSTEM', 'LAB_UPDATE');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
