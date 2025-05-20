import { Request, Response } from "express";
import {
  PrismaClient,
  TransactionMethod,
  TransactionType,
  WithdrawalType,
  VoucherType,
} from "@prisma/client/edge";
import { Decimal } from "decimal.js";
import {
  subscribeInvestmentType,
  withdrawPreMaturityType,
} from "../validation/investment.validation.js";
import { addYears, differenceInDays } from "date-fns";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

export class InvestmentController {
  static async getInvestmentPlans(req: Request, res: Response): Promise<void> {
    try {
      const investmentPlans = await prisma.investmentPlan.findMany();
      res.status(200).json({ investmentPlans });
    } catch (error) {
      console.error("Error in InvestmentController.getInvestmentPlans:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async subscribeInvestment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const payload: subscribeInvestmentType = req.body;

      const investmentPlan = await prisma.investmentPlan.findUnique({
        where: {
          id: payload.investmentPlanId,
        },
      });
      if (!investmentPlan) {
        res.status(404).json({ message: "Investment plan not found" });
        return;
      }

      if (investmentPlan.status !== "ACTIVE") {
        res.status(400).json({ message: "Investment plan is not active" });
        return;
      }

      if (investmentPlan.type === "SIP") {
        res.status(400).json({ message: "SIP are coming soon" });
        return;
      }

      if (
        new Decimal(payload.investedAmount).lessThan(
          investmentPlan.minInvestment
        )
      ) {
        res.status(400).json({
          message: `Minimum investment amount is ${investmentPlan.minInvestment}.`,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      });

      if (user?.availableBalance.lessThan(payload.investedAmount)) {
        res.status(400).json({ message: "Insufficient balance" });
        return;
      }

      const investmentDate = new Date();
      const maturityDate = addYears(
        investmentDate,
        investmentPlan.investmentTerm
      );

      const newInvestment = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            id: req.user!.userId,
          },
          data: {
            availableBalance: {
              decrement: payload.investedAmount,
            },
          },
        });
        const investment = await tx.userInvestment.create({
          data: {
            userId: req.user!.userId,
            investmentPlanId: payload.investmentPlanId,
            investedAmount: payload.investedAmount,
            investmentDate,
            maturityDate,
            withdrawalFrequency: payload.withdrawalFrequency,
          },
        });
        const fundTransaction = await tx.fundTransaction.create({
          data: {
            userId: req.user!.userId,
            debitAmount: payload.investedAmount,
            type: TransactionType.WITHDRAWAL,
            method: TransactionMethod.NEFT,
            voucherType: VoucherType.BOOK_VOUCHER,
          },
        });
        return investment;
      });
      res.status(201).json({
        message: "Investment subscribed successfully",
        investment: newInvestment,
      });
    } catch (error) {
      console.error(
        "Error in InvestmentController.subscribeInvestment:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async getUserInvestments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const investments = await prisma.userInvestment.findMany({
        where: {
          userId: req.user.userId,
        },
        include: {
          investmentPlan: {
            select: {
              investmentTerm: true,
              roiAAR: true,
              type: true,
            },
          },
        },
      });
      res.status(200).json({
        message: "Investments fetched successfully",
        investments,
      });
    } catch (error) {
      console.error("Error in InvestmentController.getUserInvestments:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async getBalance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const balance = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
        select: {
          availableBalance: true,
        },
      });
      res.status(200).json({ balance });
    } catch (error) {
      console.error("Error in InvestmentController.getBalance:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async withdrawPreMaturity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const payload: withdrawPreMaturityType = req.body;
      const investment = await prisma.userInvestment.findUnique({
        where: {
          id: payload.investmentPlanId,
          userId: req.user.userId,
        },
        include: {
          investmentPlan: true,
        },
      });
      if (!investment) {
        res.status(404).json({ message: "Investment not found" });
        return;
      }

      const T_elaspsed = differenceInDays(
        new Date(),
        investment.investmentDate
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

      const transaction = await prisma.$transaction(async (tx) => {
        const fundTransaction = await tx.fundTransaction.create({
          data: {
            userId: req.user?.userId!,
            creditAmount: NetPayout,
            type: TransactionType.DEPOSIT,
            method: TransactionMethod.NEFT,
            voucherType: VoucherType.BOOK_VOUCHER,
          },
        });
        const fundTransaction_new = await tx.fundTransaction.create({
          data: {
            userId: req.user?.userId!,
            debitAmount: exitExpense,
            type: TransactionType.WITHDRAWAL,
            method: TransactionMethod.NEFT,
            voucherType: VoucherType.JOURNAL_VOUCHER,
          },
        });
        const withdrawal = await tx.withdrawalDetails.create({
          data: {
            userId: req.user?.userId!,
            userInvestmentId: investment.id,
            type: WithdrawalType.PRE_MATURITY_EXIT,
            netAmountPaid: NetPayout,
            grossAmount: totalGain,
            lockInStageAchieved: lockInStage,
            expensePercentageApplied: expensePercentageApplied,
            expenseAmountDeducted: exitExpense,
            fundTransactionId: fundTransaction.id,
          },
        });
      });
      res.status(200).json({
        message: "Withdrawal request submitted successfully",
        transaction,
      });
    } catch (error) {
      console.error(
        "Error in InvestmentController.withdrawPreMaturity:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getWithdrawalDetails(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const { investmentPlanId } = req.params;
      const investment = await prisma.userInvestment.findUnique({
        where: {
          id: investmentPlanId,
          userId: req.user.userId,
        },
        include: {
          investmentPlan: true,
        },
      });
      if (!investment) {
        res.status(404).json({ message: "Investment not found" });
        return;
      }

      const T_elaspsed = differenceInDays(
        new Date(),
        investment.investmentDate
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
      res.status(200).json({
        message: "Withdrawal details fetched successfully",
        withdrawalDetails: {
          lockInStageAchieved: lockInStage,
          expensePercentageApplied: expensePercentageApplied,
          expenseAmountDeducted: exitExpense,
          grossAmount: totalGain,
          netAmountPaid: NetPayout,
        },
      });
    } catch (error) {
      console.error(
        "Error in InvestmentController.getWithdrawalDetails:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async checkAuth(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies.auth_token;
      if (token) {
        res.json({ authenticated: true });
      } else {
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error("Error in InvestmentController.checkAuth:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async totalInvestment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const totalInvestment = await prisma.userInvestment.aggregate({
        where: {
          userId: req.user.userId,
        },
        _sum: {
          investedAmount: true,
        },
      });
      res.status(200).json({
        message: "Total investment fetched successfully",
        totalInvestment,
      });
    } catch (error) {
      console.error("Error in InvestmentController.totalInvestment:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async totalCurrentValue(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const Investments = await prisma.userInvestment.findMany({
        where: {
          userId: req.user.userId,
        },
        include: {
          investmentPlan: true,
        },
      });

      let totalCurrentValue = new Decimal(0);

      for (const investment of Investments) {
        const T_elaspsed = differenceInDays(
          new Date(),
          investment.investmentDate
        );
        const principalAsDecimal = new Decimal(investment.investedAmount);
        const gainComponent = principalAsDecimal
          .times(investment.investmentPlan.roiAAR.div(100))
          .times(new Decimal(T_elaspsed).div(365));
        const totalGain: Decimal = principalAsDecimal.plus(gainComponent);
        totalCurrentValue = totalCurrentValue.plus(totalGain);
      }

      res.status(200).json({
        message: "Total current value fetched successfully",
        totalCurrentValue,
      });
    } catch (error) {
      console.error("Error in InvestmentController.totalCurrentValue:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async totalInvestments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const totalInvestmentGain = await prisma.userInvestment.aggregate({
        where: {
          userId: req.user.userId,
        },
        _count: true,
      });
      res.status(200).json({
        message: "Total investment gain fetched successfully",
        totalInvestmentGain,
      });
    } catch (error) {
      console.error(
        "Error in InvestmentController.totalInvestmentGain:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error in InvestmentController.logout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
