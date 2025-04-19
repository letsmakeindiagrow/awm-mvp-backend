import { z } from "zod";
export const addFundsSchema = z.object({
  paymentMethod: z.enum(["NEFT", "UPI"]),
  amount: z.number(),
  referenceNumber: z.string(),
  comments: z.string().optional(),
});

export const withdrawFundsSchema = z.object({
  amount: z.number(),
});

export const transactionSchema = z.object({
  transactionsId: z.string(),
  datetime: z.string().datetime(),
  method: z.enum(["NEFT", "UPI"]),
  type: z.enum(["WITHDRAWAL", "DEPOSIT"]),
  amount: z.number(),
  refNumber: z.string(),
  balance: z.number(),
  remark: z.string().optional(),
});

export type addFundType = z.infer<typeof addFundsSchema>;
export type TransactionTypes = z.infer<typeof transactionSchema>;
export type withdrawFundType = z.infer<typeof withdrawFundsSchema>;
