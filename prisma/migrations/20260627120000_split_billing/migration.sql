-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "SubscriptionMember" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "shareWeight" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionMember_subscriptionId_idx" ON "SubscriptionMember"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionMember_userId_idx" ON "SubscriptionMember"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionMember_email_idx" ON "SubscriptionMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionMember_subscriptionId_email_key" ON "SubscriptionMember"("subscriptionId", "email");

-- AddForeignKey
ALTER TABLE "SubscriptionMember" ADD CONSTRAINT "SubscriptionMember_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionMember" ADD CONSTRAINT "SubscriptionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
