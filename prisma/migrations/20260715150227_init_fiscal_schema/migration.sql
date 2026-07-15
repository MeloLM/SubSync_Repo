-- CreateEnum
CREATE TYPE "ExpenseNature" AS ENUM ('PERSONAL', 'BUSINESS', 'MIXED');

-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM ('NONE', 'RECEIPT', 'INVOICE');

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('STANDARD', 'REDUCED', 'EXEMPT', 'REVERSE_CHARGE', 'NON_TAXABLE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amountIsGross" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "costDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "documentType" "FiscalDocumentType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "expenseNature" "ExpenseNature" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN     "supplierVatId" TEXT,
ADD COLUMN     "vatDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 22,
ADD COLUMN     "vatRegime" "VatRegime" DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "nature" "ExpenseNature" NOT NULL DEFAULT 'BUSINESS',
    "defaultCostDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 22,
    "defaultVatDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_userId_idx" ON "ExpenseCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_userId_name_key" ON "ExpenseCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "Subscription_categoryId_idx" ON "Subscription"("categoryId");

-- CreateIndex
CREATE INDEX "Subscription_userId_expenseNature_idx" ON "Subscription"("userId", "expenseNature");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

