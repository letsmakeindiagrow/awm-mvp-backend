import { Request, Response } from "express";
import {
  PrismaClient,
  TransactionMethod,
  TransactionType,
  WithdrawalType,
  VoucherType,
  UserInvestmentStatus,
  WithdrawalFrequency,
  TransactionStatus,
  WithdrawalStatus,
  ProductType,
} from "@prisma/client/edge";
import { Decimal } from "decimal.js";
import {
  subscribeInvestmentType,
  withdrawPreMaturityType,
  withdrawMaturityType,
} from "../validation/investment.validation.js";
import { addDays, addYears, differenceInDays, isSameDay } from "date-fns";
import { withAccelerate } from "@prisma/extension-accelerate";
import { investmentConfirmationMail } from "../services/investmentConfirmation.js";
import { calculateWithdrawalDetails } from "../services/withdrawHelper.js";
import { date } from "zod";

const prisma = new PrismaClient().$extends(withAccelerate());

const domain = process.env.COOKIE_DOMAIN;

export class InvestmentController {
  static async getInvestmentPlans(req: Request, res: Response): Promise<void> {
    try {
      const investmentPlans = await prisma.investmentPlan.findMany({
        where: {
          status: "ACTIVE",
        },
      });
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
          status: "ACTIVE",
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

      let payoutInstallmentCount = 0;

      if (payload.withdrawalFrequency === WithdrawalFrequency.QUARTERLY) {
        payoutInstallmentCount = investmentPlan.investmentTerm * 4;
      }

      if (payload.withdrawalFrequency === WithdrawalFrequency.ANNUAL) {
        payoutInstallmentCount = investmentPlan.investmentTerm;
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
            payoutInstallmentCount: payoutInstallmentCount,
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
        await investmentConfirmationMail(
          user?.email || "",
          user?.firstName || "",
          investmentPlan.name || "",
          Number(payload.investedAmount),
          investmentDate.toISOString(),
          fundTransaction.id
        );
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
              name: true,
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

      const lastWithdrawalDetails = await prisma.withdrawalDetails.findFirst({
        where: {
          userInvestmentId: payload.userInvestmentId,
        },
        orderBy: {
          initiatedAt: "desc",
        },
        take: 1,
      });

      if (lastWithdrawalDetails) {
        if (lastWithdrawalDetails.installmentLeft === 0) {
          res.status(400).json({ message: "No more installments left" });
          return;
        }
      }

      const withdrawalDetails = await calculateWithdrawalDetails(
        payload.userInvestmentId,
        lastWithdrawalDetails?.initiatedAt || undefined
      );
      if (!withdrawalDetails.success) {
        res.status(400).json({ message: withdrawalDetails.message });
        return;
      }
      if (!withdrawalDetails.data) {
        res.status(400).json({ message: "Withdrawal details not found" });
        return;
      }
      const {
        NetPayout,
        exitExpense,
        totalGain,
        lockInStage,
        expensePercentageApplied,
      } = withdrawalDetails.data;

      const userInvestment = await prisma.userInvestment.findUnique({
        where: {
          id: payload.userInvestmentId,
        },
      });
      if (userInvestment?.status !== UserInvestmentStatus.ACTIVE) {
        res.status(400).json({ message: "Investment is not active" });
        return;
      }
      const transaction = await prisma.$transaction(async (tx) => {
        // Get current user balance to calculate new balance after transaction
        const currentUser = await tx.user.findUnique({
          where: { id: req.user?.userId! },
          select: { availableBalance: true },
        });

        // Update user balance by adding the net payout
        const updatedUser = await tx.user.update({
          where: { id: req.user?.userId! },
          data: {
            availableBalance: {
              increment: NetPayout,
            },
          },
        });

        // Create credit transaction (auto-approved)
        const fundTransaction = await tx.fundTransaction.create({
          data: {
            userId: req.user?.userId!,
            creditAmount: NetPayout,
            type: TransactionType.DEPOSIT,
            method: TransactionMethod.NEFT,
            voucherType: VoucherType.BOOK_VOUCHER,
            status: TransactionStatus.APPROVED,
            balance: updatedUser.availableBalance,
          },
        });

        // Create debit transaction for penalty/expense (auto-approved)
        const fundTransaction_new = await tx.fundTransaction.create({
          data: {
            userId: req.user?.userId!,
            debitAmount: exitExpense,
            type: TransactionType.WITHDRAWAL,
            method: TransactionMethod.NEFT,
            voucherType: VoucherType.JOURNAL_VOUCHER,
            status: TransactionStatus.APPROVED,
            balance: updatedUser.availableBalance,
          },
        });

        // Create withdrawal details record (auto-completed)
        const withdrawal = await tx.withdrawalDetails.create({
          data: {
            userId: req.user?.userId!,
            userInvestmentId: payload.userInvestmentId,
            type: WithdrawalType.PRE_MATURITY_EXIT,
            netAmountPaid: NetPayout,
            grossAmount: totalGain,
            lockInStageAchieved: lockInStage,
            expensePercentageApplied: expensePercentageApplied,
            expenseAmountDeducted: exitExpense,
            fundTransactionId: fundTransaction.id,
            status: WithdrawalStatus.COMPLETED,
            processedAt: new Date(),
          },
        });

        // Update investment status
        await tx.userInvestment.update({
          where: {
            id: payload.userInvestmentId,
          },
          data: {
            status: UserInvestmentStatus.WITHDRAWN_PREMATURELY,
          },
        });

        return { fundTransaction, withdrawal };
      });

      res.status(200).json({
        message: "Withdrawal completed successfully",
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
      const { userInvestmentId } = req.params;
      if (!userInvestmentId) {
        res.status(400).json({ message: "User investment ID is required" });
        return;
      }
      const withdrawalDetails = await calculateWithdrawalDetails(
        userInvestmentId
      );
      if (!withdrawalDetails.success) {
        res.status(400).json({ message: withdrawalDetails.message });
        return;
      }
      if (!withdrawalDetails.data) {
        res.status(400).json({ message: "Withdrawal details not found" });
        return;
      }
      const {
        lockInStage,
        expensePercentageApplied,
        exitExpense,
        NetPayout,
        totalGain,
      } = withdrawalDetails.data;
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
        secure: true,
        sameSite: "none",
        domain: domain,
        path: "/",
      });
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error in InvestmentController.logout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async withdrawMaturity(
    userId: string,
    investmentPlanId: string,
    userInvestmentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // under process
      return {
        success: true,
        message: "Maturity withdrawal under process",
      };
    } catch (error) {
      console.error("Error in InvestmentController.withdrawMaturity:", error);
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
  static async getUserInfo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      });
      res.status(200).json({ user });
    } catch (error) {
      console.error("Error in InvestmentController.getUserInfo:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async processQuaterlyPayout(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const Investments = await prisma.userInvestment.findMany({
        where: {
          userId: userId,
          status: UserInvestmentStatus.ACTIVE,
          withdrawalFrequency: WithdrawalFrequency.QUARTERLY,
        },
        include: {
          investmentPlan: true,
        },
      });
      for (const investment of Investments) {
        if (investment.status !== UserInvestmentStatus.ACTIVE) {
          continue;
        }
        const withdrawalDetails = await prisma.withdrawalDetails.findFirst({
          where: {
            userInvestmentId: investment.id,
            type: WithdrawalType.SCHEDULED_PAYOUT,
          },
          orderBy: {
            initiatedAt: "desc",
          },
          take: 1,
        });
        if (withdrawalDetails) {
          if (withdrawalDetails.installmentLeft === 0) {
            console.log(
              "Installment left is 0",
              "Investment Closing under process"
            );
            const closing = await prisma.$transaction(async (tx) => {
              await tx.userInvestment.update({
                where: { id: investment.id },
                data: { status: UserInvestmentStatus.MATURED },
              });
              const user = await tx.user.findUnique({
                where: { id: userId },
                select: { availableBalance: true },
              });
              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: investment.investedAmount,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: user?.availableBalance.plus(
                    investment.investedAmount
                  ),
                },
              });
              const new_user = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: investment.investedAmount,
                  },
                },
              });
            });
            continue;
          }
        }
        if (!withdrawalDetails) {
          const firstInvestmentDate = investment.investmentDate;
          const nextPayoutDate = addDays(firstInvestmentDate, 90);
          if (isSameDay(nextPayoutDate, new Date())) {
            const principalAsDecimal = new Decimal(investment.investedAmount);
            const gainComponent = principalAsDecimal
              .times(investment.investmentPlan.roiAAR.div(100))
              .times(new Decimal(90).div(365));

            const transactions = await prisma.$transaction(async (tx) => {
              // Update user balance
              const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: gainComponent,
                  },
                },
              });

              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: gainComponent,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: updatedUser.availableBalance,
                },
              });
              const withdrawal = await tx.withdrawalDetails.create({
                data: {
                  userId: userId,
                  userInvestmentId: investment.id,
                  type: WithdrawalType.SCHEDULED_PAYOUT,
                  netAmountPaid: gainComponent,
                  grossAmount: gainComponent,
                  fundTransactionId: fundTransaction.id,
                  status: WithdrawalStatus.COMPLETED,
                  processedAt: new Date(),
                  installmentLeft: investment.payoutInstallmentCount! - 1,
                },
              });
            });
          }
        } else {
          const nextPayoutDate = addDays(withdrawalDetails.initiatedAt, 90);
          if (isSameDay(nextPayoutDate, new Date())) {
            const principalAsDecimal = new Decimal(investment.investedAmount);
            const gainComponent = principalAsDecimal
              .times(investment.investmentPlan.roiAAR.div(100))
              .times(new Decimal(90).div(365));

            const transactions = await prisma.$transaction(async (tx) => {
              // Update user balance
              const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: gainComponent,
                  },
                },
              });

              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: gainComponent,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: updatedUser.availableBalance,
                },
              });
              const withdrawal = await tx.withdrawalDetails.create({
                data: {
                  userId: userId,
                  userInvestmentId: investment.id,
                  type: WithdrawalType.SCHEDULED_PAYOUT,
                  netAmountPaid: gainComponent,
                  grossAmount: gainComponent,
                  fundTransactionId: fundTransaction.id,
                  status: WithdrawalStatus.COMPLETED,
                  processedAt: new Date(),
                  installmentLeft: withdrawalDetails.installmentLeft! - 1,
                },
              });
            });
          }
        }
      }
      return {
        success: true,
        message: "Quaterly payout checked and processed successfully",
      };
    } catch (error) {
      console.error(
        "Error in InvestmentController.processQuaterlyPayout:",
        error
      );
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
  static async annualPayout(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const Investments = await prisma.userInvestment.findMany({
        where: {
          userId: userId,
          status: UserInvestmentStatus.ACTIVE,
          withdrawalFrequency: WithdrawalFrequency.ANNUAL,
        },
        include: {
          investmentPlan: true,
        },
      });
      for (const investment of Investments) {
        if (investment.status !== UserInvestmentStatus.ACTIVE) {
          continue;
        }
        const withdrawalDetails = await prisma.withdrawalDetails.findFirst({
          where: {
            userInvestmentId: investment.id,
            type: WithdrawalType.SCHEDULED_PAYOUT,
          },
          orderBy: {
            initiatedAt: "desc",
          },
          take: 1,
        });
        if (withdrawalDetails) {
          if (withdrawalDetails.installmentLeft === 0) {
            console.log(
              "Installment left is 0",
              "Investment Closing under process"
            );
            const closing = await prisma.$transaction(async (tx) => {
              await tx.userInvestment.update({
                where: { id: investment.id },
                data: { status: UserInvestmentStatus.MATURED },
              });
              const user = await tx.user.findUnique({
                where: { id: userId },
                select: { availableBalance: true },
              });
              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: investment.investedAmount,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: user?.availableBalance.plus(
                    investment.investedAmount
                  ),
                },
              });
              const new_user = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: investment.investedAmount,
                  },
                },
              });
            });
            continue;
          }
        }
        if (!withdrawalDetails) {
          const firstInvestmentDate = investment.investmentDate;
          const nextPayoutDate = addDays(firstInvestmentDate, 365);
          if (isSameDay(nextPayoutDate, new Date())) {
            const principalAsDecimal = new Decimal(investment.investedAmount);
            const gainComponent = principalAsDecimal
              .times(investment.investmentPlan.roiAAR.div(100))
              .times(new Decimal(365).div(365));

            const transactions = await prisma.$transaction(async (tx) => {
              // Update user balance
              const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: gainComponent,
                  },
                },
              });

              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: gainComponent,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: updatedUser.availableBalance,
                },
              });
              const withdrawal = await tx.withdrawalDetails.create({
                data: {
                  userId: userId,
                  userInvestmentId: investment.id,
                  type: WithdrawalType.SCHEDULED_PAYOUT,
                  netAmountPaid: gainComponent,
                  grossAmount: gainComponent,
                  fundTransactionId: fundTransaction.id,
                  status: WithdrawalStatus.COMPLETED,
                  processedAt: new Date(),
                  installmentLeft: investment.payoutInstallmentCount! - 1,
                },
              });
            });
          }
        } else {
          const nextPayoutDate = addDays(withdrawalDetails.initiatedAt, 365);
          if (isSameDay(nextPayoutDate, new Date())) {
            const principalAsDecimal = new Decimal(investment.investedAmount);
            const gainComponent = principalAsDecimal
              .times(investment.investmentPlan.roiAAR.div(100))
              .times(new Decimal(365).div(365));

            const transactions = await prisma.$transaction(async (tx) => {
              // Update user balance
              const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                  availableBalance: {
                    increment: gainComponent,
                  },
                },
              });

              const fundTransaction = await tx.fundTransaction.create({
                data: {
                  userId: userId,
                  creditAmount: gainComponent,
                  type: TransactionType.DEPOSIT,
                  method: TransactionMethod.NEFT,
                  voucherType: VoucherType.BOOK_VOUCHER,
                  status: TransactionStatus.APPROVED,
                  balance: updatedUser.availableBalance,
                },
              });
              const withdrawal = await tx.withdrawalDetails.create({
                data: {
                  userId: userId,
                  userInvestmentId: investment.id,
                  type: WithdrawalType.SCHEDULED_PAYOUT,
                  netAmountPaid: gainComponent,
                  grossAmount: gainComponent,
                  fundTransactionId: fundTransaction.id,
                  status: WithdrawalStatus.COMPLETED,
                  processedAt: new Date(),
                  installmentLeft: withdrawalDetails.installmentLeft! - 1,
                },
              });
            });
          }
        }
      }
      return {
        success: true,
        message: "Annual payout checked and processed successfully",
      };
    } catch (error) {
      console.error("Error in InvestmentController.annualPayout:", error);
      return {
        success: false,
        message: "Internal server error",
      };
    }
  }
}
