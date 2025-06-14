import { PrismaClient, UserInvestment } from "@prisma/client/edge";
import { Decimal } from "decimal.js";
import { differenceInDays } from "date-fns";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

export async function calculateWithdrawalDetails(
  userInvestmentId: string,
  lastWithdrawalDate?: Date
): Promise<{
  success: boolean;
  message: string;
  data?: {
    principalAsDecimal: Decimal;
    gainComponent: Decimal;
    lockInStage: number;
    expensePercentageApplied: number;
    totalGain: Decimal;
    exitExpense: Decimal;
    NetPayout: Decimal;
  };
}> {
  const investment = await prisma.userInvestment.findUnique({
    where: {
      id: userInvestmentId,
    },
    include: {
      investmentPlan: true,
    },
  });
  if (!investment) {
    return {
      success: false,
      message: "Investment not found",
      data: undefined,
    };
  }

  const T_elaspsed = differenceInDays(
    new Date(),
    lastWithdrawalDate || investment.investmentDate
  );
  const T_lockIn = investment.investmentPlan.investmentTerm * 365;
  const P_completed = (T_elaspsed / T_lockIn) * 100;
  let lockInStage = 0;
  let expensePercentageApplied = 0;
  if (0 < P_completed && P_completed <= 25) {
    lockInStage = 1;
    expensePercentageApplied = 5;
  } else if (25 < P_completed && P_completed <= 50) {
    lockInStage = 2;
    expensePercentageApplied = 3.5;
  } else if (50 < P_completed && P_completed <= 75) {
    lockInStage = 3;
    expensePercentageApplied = 2.5;
  } else if (75 < P_completed && P_completed <= 100) {
    lockInStage = 4;
    expensePercentageApplied = 0;
  }

  const principalAsDecimal = new Decimal(investment.investedAmount);
  const gainComponent = principalAsDecimal
    .times(investment.investmentPlan.roiAAR.div(100))
    .times(new Decimal(T_elaspsed).div(365));

  const totalGain: Decimal = principalAsDecimal.plus(gainComponent);
  const exitExpense = totalGain.times(expensePercentageApplied).div(100);
  const NetPayout = totalGain.minus(exitExpense);

  return {
    success: true,
    message: "Withdrawal details calculated successfully",
    data: {
      principalAsDecimal,
      gainComponent,
      lockInStage,
      expensePercentageApplied,
      totalGain,
      exitExpense,
      NetPayout,
    },
  };
}
