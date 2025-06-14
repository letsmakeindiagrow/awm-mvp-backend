/*
  Warnings:

  - You are about to drop the column `payoutInstallmentCount` on the `InvestmentPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InvestmentPlan" DROP COLUMN "payoutInstallmentCount";

-- AlterTable
ALTER TABLE "UserInvestment" ADD COLUMN     "payoutInstallmentCount" INTEGER;
