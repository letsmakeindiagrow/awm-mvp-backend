import { z } from "zod";
import { WithdrawalFrequency } from "@prisma/client";
export const subscribeInvestmentSchema = z.object({
  investmentPlanId: z.string(),
  withdrawalFrequency: z.nativeEnum(WithdrawalFrequency),
  investedAmount: z.number(),
});

export const withdrawPreMaturitySchema = z.object({
  investmentPlanId: z.string(),
  userInvestmentId: z.string(),
});

export const withdrawMaturitySchema = z.object({
  investmentPlanId: z.string(),
  userInvestmentId: z.string(),
});

export type subscribeInvestmentType = z.infer<typeof subscribeInvestmentSchema>;
export type withdrawPreMaturityType = z.infer<typeof withdrawPreMaturitySchema>;
export type withdrawMaturityType = z.infer<typeof withdrawMaturitySchema>;
