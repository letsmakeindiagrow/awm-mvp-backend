-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIP', 'LUMPSUM');

-- CreateTable
CREATE TABLE "InvestmentPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roiAAR" DECIMAL(65,30) NOT NULL,
    "roiAMR" DECIMAL(65,30) NOT NULL,
    "minInvestment" DECIMAL(65,30) NOT NULL,
    "investmentTerm" INTEGER NOT NULL,
    "totalGain" DECIMAL(65,30) NOT NULL,
    "maturityValue" DECIMAL(65,30) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "ProductType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPlan_pkey" PRIMARY KEY ("id")
);
