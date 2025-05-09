/*
  Warnings:

  - You are about to drop the column `investmentMode` on the `UserInvestment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WithdrawalType" AS ENUM ('PRE_MATURITY_EXIT', 'SCHEDULED_PAYOUT');

-- AlterEnum
ALTER TYPE "UserInvestmentStatus" ADD VALUE 'WITHDRAWN_PREMATURELY';

-- AlterTable
ALTER TABLE "InvestmentPlan" ADD COLUMN     "payoutInstallmentCount" INTEGER;

-- AlterTable
ALTER TABLE "UserInvestment" DROP COLUMN "investmentMode",
ADD COLUMN     "totalMaturedValue" DECIMAL(65,30);

-- DropEnum
DROP TYPE "InvestmentMode";

-- CreateTable
CREATE TABLE "WithdrawalDetails" (
    "id" TEXT NOT NULL,
    "userInvestmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WithdrawalType" NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PROCESSING',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "grossAmount" DECIMAL(65,30),
    "netAmountPaid" DECIMAL(65,30) NOT NULL,
    "lockInStageAchieved" INTEGER,
    "expensePercentageApplied" DECIMAL(65,30),
    "expenseAmountDeducted" DECIMAL(65,30),
    "fundTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalDetails_fundTransactionId_key" ON "WithdrawalDetails"("fundTransactionId");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_userInvestmentId_idx" ON "WithdrawalDetails"("userInvestmentId");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_userId_idx" ON "WithdrawalDetails"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_status_idx" ON "WithdrawalDetails"("status");

-- CreateIndex
CREATE INDEX "WithdrawalDetails_type_idx" ON "WithdrawalDetails"("type");

-- AddForeignKey
ALTER TABLE "WithdrawalDetails" ADD CONSTRAINT "WithdrawalDetails_userInvestmentId_fkey" FOREIGN KEY ("userInvestmentId") REFERENCES "UserInvestment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDetails" ADD CONSTRAINT "WithdrawalDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalDetails" ADD CONSTRAINT "WithdrawalDetails_fundTransactionId_fkey" FOREIGN KEY ("fundTransactionId") REFERENCES "FundTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
