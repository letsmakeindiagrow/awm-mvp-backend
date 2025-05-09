/*
  Warnings:

  - You are about to drop the column `amount` on the `FundTransaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('BANK_RECEIPT', 'BANK_PAYMENT', 'JOURNAL_VOUCHER', 'BOOK_VOUCHER_CREDIT', 'BOOK_VOUCHER_DEBIT');

-- AlterTable
ALTER TABLE "FundTransaction" DROP COLUMN "amount",
ADD COLUMN     "Narration" TEXT,
ADD COLUMN     "creditAmount" DECIMAL(65,30),
ADD COLUMN     "debitAmount" DECIMAL(65,30),
ADD COLUMN     "voucherType" "VoucherType";
