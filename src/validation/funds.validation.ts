import { z } from "zod";
export const addFundsSchema = z.object({
  userId: z.string(),
  paymentMethod: z.enum(["NEFT", "UPI"]),
  amount: z.number(),
  referenceNumber: z.number(),
  comments: z.string().optional(),
});

export const withdrawFundsSchema = z.object({
  userId: z.string(),
  amount: z.number(),
});

export type addFundType = z.infer<typeof addFundsSchema>;
export type withdrawFundType = z.infer<typeof withdrawFundsSchema>;
