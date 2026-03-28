-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "TicketMessage" ADD COLUMN     "senderName" TEXT;
