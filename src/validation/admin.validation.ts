import { z } from "zod";

export const createInvestmentPlanSchema = z.object({
  name: z.string(),
  roiAAR: z.number(),
  roiAMR: z.number(),
  minInvestment: z.number(),
  investmentTerm: z.number(),
  status: z.enum(["ACTIVE", "DEACTIVATED"]),
  type: z.enum(["SIP", "LUMPSUM"]),
});

export type createInvestmentPlanSchemaType = z.infer<
  typeof createInvestmentPlanSchema
>;
