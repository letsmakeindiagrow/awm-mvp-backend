import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  PrismaClient,
  ProductStatus,
  TransactionStatus,
  TransactionType,
  UserInvestmentStatus,
  VerificationStatus,
} from "@prisma/client";
import { createInvestmentPlanSchemaType } from "../validation/admin.validation.js";

const prisma = new PrismaClient();

export class AdminController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      if (
        req.body.email !== process.env.ADMIN_EMAIL ||
        req.body.password !== process.env.ADMIN_PASSWORD
      ) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = jwt.sign(
        { email: req.body.email },
        process.env.JWT_SECRET || ""
      );
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: "localhost",
        maxAge: 10 * 60 * 60 * 1000,
        sameSite: "lax",
        ...(process.env.NODE_ENV === "production"
          ? { domain: "admin.aadyanviwealth.com" }
          : {}),
      });
      res.status(200).json({ message: "Login sucessful" });
      return;
    } catch (error) {
      console.error("Error in AdminController.login:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async addFunds(req: Request, res: Response): Promise<void> {
    try {
      const { transactionsId, status } = req.body;
      if (status === "approve") {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.fundTransaction.update({
            where: {
              id: transactionsId,
            },
            data: {
              status: TransactionStatus.APPROVED,
            },
            select: {
              userId: true,
              amount: true,
            },
          });
          await tx.user.update({
            where: {
              id: transaction.userId,
            },
            data: {
              availableBalance: {
                increment: transaction.amount,
              },
            },
          });
        });

        res.status(200).json({
          message: "Transaction approved",
        });
      } else {
        await prisma.$transaction(async (tx) => {
          await tx.fundTransaction.update({
            where: {
              id: transactionsId,
              type: TransactionType.DEPOSIT,
            },
            data: {
              status: TransactionStatus.REJECTED,
            },
          });
        });
        res.status(200).json({
          message: "Transaction rejected",
        });
      }
    } catch (error) {
      console.error("Error in AdminController.addFunds:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      const { transactionsId, status } = req.body;
      if (status === "approved") {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.fundTransaction.update({
            where: {
              id: transactionsId,
              type: TransactionType.WITHDRAWAL,
            },
            data: {
              status: TransactionStatus.APPROVED,
            },
            select: {
              userId: true,
              amount: true,
            },
          });
          await tx.user.update({
            where: {
              id: transaction.userId,
            },
            data: {
              availableBalance: {
                decrement: transaction.amount,
              },
            },
          });
        });

        res.status(200).json({
          message: "Withdrawal approved",
        });
      } else {
        await prisma.fundTransaction.update({
          where: {
            id: transactionsId,
            type: TransactionType.WITHDRAWAL,
          },
          data: {
            status: TransactionStatus.REJECTED,
          },
        });
        res.status(200).json({
          message: "Withdrawal rejected",
        });
      }
    } catch (error) {
      console.error("Error in AdminController.withdrawFunds:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getDepositTransactions(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const transactions = await prisma.fundTransaction.findMany({
        where: {
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
        },
        select: {
          id: true,
          amount: true,
          method: true,
          referenceNumber: true,
          status: true,
          remark: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      res.status(200).json({ transactions });
    } catch (error) {
      console.error("Error in AdminController.getTransactions:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async getWithdrawalTransactions(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const transactions = await prisma.fundTransaction.findMany({
        where: {
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.PENDING,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      res.status(200).json({ transactions });
    } catch (error) {
      console.error(
        "Error in AdminController.getWithdrawalTransactions:",
        error
      );
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          availableBalance: true,
          verificationState: true,
          createdAt: true,
        },
      });
      res.status(200).json({ users });
    } catch (error) {
      console.error("Error in AdminController.getUsers:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      res.status(200).json({ user });
    } catch (error) {
      console.error("Error in AdminController.getUserById:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  static async verifyUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, status } = req.body;
      if (status === "approve") {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            verificationState: VerificationStatus.VERIFIED,
          },
        });

        res.status(200).json({
          message: "user approved",
        });
      } else {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            verificationState: VerificationStatus.REJECTED,
          },
        });
        res.status(200).json({
          message: "user rejected",
        });
      }
    } catch (error) {
      console.error("Error in AdminController.verifyUser:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async createInvestmentPlan(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const ResponsePayload: createInvestmentPlanSchemaType = req.body;
      const totalGain =
        ResponsePayload.minInvestment *
        ResponsePayload.roiAAR *
        ResponsePayload.investmentTerm;
      const maturityValue = ResponsePayload.minInvestment + totalGain;
      const investmentPlan = await prisma.investmentPlan.create({
        data: {
          name: ResponsePayload.name,
          roiAAR: ResponsePayload.roiAAR,
          roiAMR: ResponsePayload.roiAMR,
          minInvestment: ResponsePayload.minInvestment,
          investmentTerm: ResponsePayload.investmentTerm,
          totalGain: totalGain,
          maturityValue: maturityValue,
          status: ResponsePayload.status,
          type: ResponsePayload.type,
        },
      });
      res.status(200).json({
        message: "Investment plan created successfully",
        investmentPlan,
      });
    } catch (error) {
      console.error("Error in AdminController.createInvestmentPlan:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getInvestmentPlans(req: Request, res: Response): Promise<void> {
    try {
      const investmentPlans = await prisma.investmentPlan.findMany();
      res.status(200).json({ investmentPlans });
    } catch (error) {
      console.error("Error in AdminController.getInvestmentPlans:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getUnusedFunds(req: Request, res: Response): Promise<void> {
    try {
      const funds = await prisma.user.aggregate({
        _sum: {
          availableBalance: true,
        },
      });
      res.status(200).json({ funds });
    } catch (error) {
      console.error("error : ", error);
      res.status(500).json({ message: "internal server error" });
    }
  }
  static async pendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.aggregate({
        _count: {
          verificationState: true,
        },
        where: {
          verificationState: VerificationStatus.PENDING,
        },
      });
      const funds = await prisma.fundTransaction.aggregate({
        _count: {
          status: true,
        },
        where: {
          status: TransactionStatus.PENDING,
        },
      });
      const pendingUserCount = users._count?.verificationState ?? 0;
      const pendingFundCount = funds._count?.status ?? 0;
      const totalPending = pendingUserCount + pendingFundCount;
      res.status(200).json({ totalPending });
    } catch (error) {
      console.error("the error is : ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async activePlans(req: Request, res: Response): Promise<void> {
    try {
      const plansByType = await prisma.investmentPlan.groupBy({
        by: ["type"],
        where: { status: ProductStatus.ACTIVE },
        _count: { type: true },
      });
      const totalPlans = plansByType.reduce((sum, p) => sum + p._count.type, 0);
      res.status(200).json({ totalPlans, plansByType });
    } catch (error) {
      console.error("the error is : ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async aum(req: Request, res: Response): Promise<void> {
    try {
      const assets = await prisma.userInvestment.aggregate({
        _sum: {
          investedAmount: true,
        },
      });
      res.status(200).json({ assets });
    } catch (error) {
      console.error("error : ", error);
      res.status(500).json({ message: "internal server error" });
    }
  }
  static async activeInvestors(req: Request, res: Response): Promise<void> {
    try {
      const count = await prisma.user.count({
        where: {
          investments: {
            some: {
              status: UserInvestmentStatus.ACTIVE,
            },
          },
        },
      });
      res.status(200).json({ count });
    } catch (error) {
      console.error("the error is : ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      res.clearCookie("admin_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        domain: "localhost",
        sameSite: "lax",
        ...(process.env.NODE_ENV === "production"
          ? { domain: "admin.aadyanviwealth.com" }
          : {}),
      });
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error in AdminController.logout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async checkAuth(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies.admin_token;
      if (token) {
        res.json({ authenticated: true });
      } else {
        res.json({ authenticated: true });
      }
    } catch (error) {
      console.error("Error in AdminController.checkAuth:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
