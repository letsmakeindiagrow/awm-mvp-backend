import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  PrismaClient,
  ProductStatus,
  TransactionStatus,
  TransactionType,
  UserInvestmentStatus,
  VerificationStatus,
  VoucherType,
  WithdrawalStatus,
} from "@prisma/client/edge";
import {
  createInvestmentPlanSchemaType,
  createNewUserSchemaType,
  editInvestmentPlanSchemaType,
  planStatusSchemaType,
} from "../validation/admin.validation.js";
import bcrypt from "bcrypt";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

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
        maxAge: 10 * 60 * 60 * 1000,
        sameSite: "lax",
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
      if (status === "approved") {
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
              creditAmount: true,
              voucherType: true,
            },
          });
          const user = await tx.user.update({
            where: {
              id: transaction.userId,
            },
            data: {
              availableBalance: {
                increment: transaction.creditAmount ?? 0,
              },
            },
          });
          await tx.fundTransaction.update({
            where: {
              id: transactionsId,
            },
            data: {
              balance: user.availableBalance,
            },
          });
          if (transaction.voucherType === VoucherType.BOOK_VOUCHER) {
            await tx.withdrawalDetails.update({
              where: {
                fundTransactionId: transactionsId,
              },
              data: {
                status: WithdrawalStatus.COMPLETED,
                processedAt: new Date(),
              },
            });
          }
        });
        res.status(200).json({
          message: "Transaction approved",
        });
      } else {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.fundTransaction.update({
            where: {
              id: transactionsId,
              type: TransactionType.DEPOSIT,
            },
            data: {
              status: TransactionStatus.REJECTED,
            },
            select: {
              userId: true,
            },
          });
          const user = await tx.user.findUnique({
            where: {
              id: transaction.userId,
            },
            select: {
              availableBalance: true,
            },
          });
          await tx.fundTransaction.update({
            where: {
              id: transactionsId,
            },
            data: {
              balance: user?.availableBalance,
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
              status: TransactionStatus.PENDING,
            },
            data: {
              status: TransactionStatus.APPROVED,
            },
            select: {
              userId: true,
              debitAmount: true,
            },
          });
          const balance = await tx.user.findUnique({
            where: {
              id: transaction.userId,
            },
            select: {
              availableBalance: true,
            },
          });
          if (!balance) {
            res.status(400).json({ message: "User not found" });
            return;
          }
          if (balance.availableBalance < transaction.debitAmount!) {
            res.status(400).json({ message: "Insufficient balance" });
            return;
          }
          const user = await tx.user.update({
            where: {
              id: transaction.userId,
            },
            data: {
              availableBalance: {
                decrement: transaction.debitAmount ?? 0,
              },
            },
          });
          await tx.user.findUnique({
            where: {
              id: transaction.userId,
            },
            select: {
              availableBalance: true,
            },
          });
          await tx.fundTransaction.update({
            where: {
              id: transactionsId,
            },
            data: {
              balance: user?.availableBalance,
            },
          });
        });

        res.status(200).json({
          message: "Withdrawal approved",
        });
      } else {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.fundTransaction.update({
            where: {
              id: transactionsId,
              type: TransactionType.WITHDRAWAL,
              status: TransactionStatus.PENDING,
            },
            data: {
              status: TransactionStatus.REJECTED,
            },
            select: {
              userId: true,
            },
          });
          const user = await tx.user.findUnique({
            where: {
              id: transaction.userId,
            },
            select: {
              availableBalance: true,
            },
          });
          await tx.fundTransaction.update({
            where: {
              id: transactionsId,
            },
            data: {
              balance: user?.availableBalance,
            },
          });
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
          creditAmount: true,
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
          debitAmount: true,
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
        sameSite: "lax",
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
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error("Error in AdminController.checkAuth:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async deleteInvestmentPlan(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { planId } = req.params;
      await prisma.investmentPlan.delete({
        where: { id: planId },
      });
      res.status(200).json({ message: "Investment plan deleted successfully" });
    } catch (error) {
      console.error("Error in AdminController.deleteInvestmentPlan:", error);
    }
  }
  static async planStatus(req: Request, res: Response): Promise<void> {
    try {
      const planStatusPayload: planStatusSchemaType = req.body;
      if (planStatusPayload.status === "ACTIVE") {
        await prisma.investmentPlan.update({
          where: { id: planStatusPayload.planId },
          data: { status: ProductStatus.ACTIVE },
        });
      } else {
        await prisma.investmentPlan.update({
          where: { id: planStatusPayload.planId },
          data: { status: ProductStatus.DEACTIVATED },
        });
      }
      res
        .status(200)
        .json({ message: "Investment plan status updated successfully" });
    } catch (error) {
      console.error("Error in AdminController.planStatus:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async editInvestmentPlan(req: Request, res: Response): Promise<void> {
    try {
      const payload: editInvestmentPlanSchemaType = req.body;
      const investmentPlan = await prisma.investmentPlan.update({
        where: { id: payload.planId },
        data: {
          name: payload.name,
          roiAAR: payload.roiAAR,
          roiAMR: payload.roiAMR,
          minInvestment: payload.minInvestment,
          investmentTerm: payload.investmentTerm,
        },
      });
      res.status(200).json({
        message: "Investment plan updated successfully",
        investmentPlan,
      });
    } catch (error) {
      console.error("Error in AdminController.editInvestmentPlan:", error);
    }
  }
  static async createNewUser(req: Request, res: Response): Promise<void> {
    try {
      const payload: createNewUserSchemaType = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: payload.email },
            { mobileNumber: payload.mobileNumber },
          ],
        },
      });

      if (existingUser) {
        res.status(400).json({
          message: "User already exists with this email or mobile number",
        });
        return;
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(payload.password, saltRounds);

      // Create user with base information first
      const user = await prisma.user.create({
        data: {
          referralCode: payload.referralCode,
          mobileNumber: payload.mobileNumber,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          dateOfBirth: payload.dateOfBirth,
          password: hashedPassword,
          verificationState: "PENDING",
          mobileVerified: false,
          emailVerified: false,
        },
      });

      // If address is provided, create it
      if (payload.address) {
        await prisma.address.create({
          data: {
            userId: user.id,
            ...payload.address,
          },
        });
      }

      // If identity details are provided, create them
      if (payload.identityDetails) {
        const identityDetails = {
          ...payload.identityDetails,
          panAttachment: files['panAttachment']?.[0]?.location,
          aadharFront: files['aadharFront']?.[0]?.location,
          aadharBack: files['aadharBack']?.[0]?.location,
        };

        await prisma.identityDetails.create({
          data: {
            userId: user.id,
            ...identityDetails,
          },
        });
      }

      // If bank details are provided, create them
      if (payload.bankDetails) {
        const bankDetails = {
          ...payload.bankDetails,
          proofAttachment: files['bankProof']?.[0]?.location,
        };

        await prisma.bankDetails.create({
          data: {
            userId: user.id,
            ...bankDetails,
          },
        });
      }

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          mobileNumber: user.mobileNumber,
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  }
}
