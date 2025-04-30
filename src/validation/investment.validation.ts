import { z } from "zod";
import { InvestmentMode, WithdrawalFrequency } from "@prisma/client";
export const subscribeInvestmentSchema = z.object({
  investmentPlanId: z.string(),
  investmentMode: z.nativeEnum(InvestmentMode),
  withdrawalFrequency: z.nativeEnum(WithdrawalFrequency),
  investedAmount: z.number(),
});

export type subscribeInvestmentType = z.infer<typeof subscribeInvestmentSchema>;
