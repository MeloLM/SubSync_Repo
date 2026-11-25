-- CreateEnum
CREATE TYPE "InboundStatus" AS ENUM ('RECEIVED', 'PARSED', 'PROPOSED', 'DISCARDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DedupeSource" AS ENUM ('MESSAGE_ID', 'CONTENT_HASH');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProposalResolution" AS ENUM ('CREATED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('CRON', 'EMAIL', 'MANUAL');

-- AlterTable
ALTER TABLE "PaymentLog" ADD COLUMN     "source" "PaymentSource" NOT NULL DEFAULT 'CRON';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inboundToken" TEXT,
ADD COLUMN     "inboundTokenRotatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "dedupeSource" "DedupeSource" NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "status" "InboundStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "authResults" JSONB,
    "parsedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inboundEmailId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "serviceName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "proposedPrice" DECIMAL(12,2),
    "matchScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "matchSignals" TEXT[],
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" "ProposalResolution",
    "paymentLogId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboundEmail_userId_status_idx" ON "InboundEmail"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmail_userId_dedupeKey_key" ON "InboundEmail"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProposal_inboundEmailId_key" ON "PaymentProposal"("inboundEmailId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProposal_paymentLogId_key" ON "PaymentProposal"("paymentLogId");

-- CreateIndex
CREATE INDEX "PaymentProposal_userId_status_idx" ON "PaymentProposal"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentProposal_subscriptionId_idx" ON "PaymentProposal"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inboundToken_key" ON "User"("inboundToken");

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_inboundEmailId_fkey" FOREIGN KEY ("inboundEmailId") REFERENCES "InboundEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProposal" ADD CONSTRAINT "PaymentProposal_paymentLogId_fkey" FOREIGN KEY ("paymentLogId") REFERENCES "PaymentLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

