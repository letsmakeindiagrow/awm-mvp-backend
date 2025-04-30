-- CreateEnum
CREATE TYPE "InvestmentMode" AS ENUM ('SIP', 'LUMPSUM');

-- CreateEnum
CREATE TYPE "WithdrawalFrequency" AS ENUM ('QUARTERLY', 'ANNUAL', 'MATURITY');

-- CreateEnum
CREATE TYPE "UserInvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "UserInvestment" (
    "id" TEXT NOT NULL,
    "investedAmount" DOUBLE PRECISION NOT NULL,
    "investmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "investmentMode" "InvestmentMode" NOT NULL,
    "withdrawalFrequency" "WithdrawalFrequency" NOT NULL,
    "status" "UserInvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "investmentPlanId" TEXT NOT NULL,

    CONSTRAINT "UserInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInvestment_userId_idx" ON "UserInvestment"("userId");

-- CreateIndex
CREATE INDEX "UserInvestment_investmentPlanId_idx" ON "UserInvestment"("investmentPlanId");

-- AddForeignKey
ALTER TABLE "UserInvestment" ADD CONSTRAINT "UserInvestment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvestment" ADD CONSTRAINT "UserInvestment_investmentPlanId_fkey" FOREIGN KEY ("investmentPlanId") REFERENCES "InvestmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
