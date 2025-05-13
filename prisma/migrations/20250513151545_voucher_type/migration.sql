/*
  Warnings:

  - Made the column `voucherType` on table `FundTransaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FundTransaction" ALTER COLUMN "voucherType" SET NOT NULL;
