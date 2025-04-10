/*
  Warnings:

  - The `referenceNumber` column on the `FundTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "FundTransaction" DROP COLUMN "referenceNumber",
ADD COLUMN     "referenceNumber" INTEGER;
