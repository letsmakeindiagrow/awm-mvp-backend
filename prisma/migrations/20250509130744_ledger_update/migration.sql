/*
  Warnings:

  - The values [BOOK_VOUCHER_CREDIT,BOOK_VOUCHER_DEBIT] on the enum `VoucherType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VoucherType_new" AS ENUM ('BANK_RECEIPT', 'BANK_PAYMENT', 'JOURNAL_VOUCHER', 'BOOK_VOUCHER');
ALTER TABLE "FundTransaction" ALTER COLUMN "voucherType" TYPE "VoucherType_new" USING ("voucherType"::text::"VoucherType_new");
ALTER TYPE "VoucherType" RENAME TO "VoucherType_old";
ALTER TYPE "VoucherType_new" RENAME TO "VoucherType";
DROP TYPE "VoucherType_old";
COMMIT;
