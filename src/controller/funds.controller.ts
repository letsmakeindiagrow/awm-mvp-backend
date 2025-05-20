import { Request, Response } from "express";
import {
  PrismaClient,
  TransactionMethod,
  TransactionType,
  TransactionStatus,
  VoucherType,
} from "@prisma/client/edge";
import {
  addFundType,
  withdrawFundType,
} from "../validation/funds.validation.js";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

export class FundsController {
  static async addFunds(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const payload: addFundType = req.body;
      await prisma.fundTransaction.create({
        data: {
          userId: req.user?.userId,
          creditAmount: payload.amount,
          type: TransactionType.DEPOSIT,
          method: payload.paymentMethod,
          referenceNumber: parseInt(payload.referenceNumber, 10),
          remark: payload.comments,
          voucherType: VoucherType.BANK_RECEIPT,
        },
      });
      res.status(201).json({ message: "Funds added successfully." });
    } catch (error) {
      console.error("Error adding funds:", error);
      res.status(500).json({ message: "Failed to add funds." });
    }
  }
  static async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const payload: withdrawFundType = req.body;
      await prisma.fundTransaction.create({
        data: {
          userId: req.user?.userId,
          debitAmount: payload.amount,
          type: TransactionType.WITHDRAWAL,
          method: TransactionMethod.NEFT,
          voucherType: VoucherType.BANK_PAYMENT,
        },
      });
      res.status(201).json({ message: "Request sent successfully" });
    } catch (error) {
      console.error("error occured :", error);
      res.status(501).json({ message: "request failed" });
    }
  }
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }

      const transactions = await prisma.fundTransaction.findMany({
        where: {
          userId: req.user?.userId,
          status: {
            in: [TransactionStatus.APPROVED, TransactionStatus.PENDING],
          },
        },
        select: {
          id: true,
          createdAt: true,
          method: true,
          type: true,
          debitAmount: true,
          creditAmount: true,
          referenceNumber: true,
          remark: true,
          balance: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedTransactions = transactions.map((tx) => ({
        transactionsId: tx.id,
        datetime: tx.createdAt.toISOString(),
        method: tx.method,
        type: tx.type,
        amount: tx.debitAmount
          ? tx.debitAmount.toNumber()
          : tx.creditAmount?.toNumber(),
        refNumber: tx.referenceNumber ? tx.referenceNumber.toString() : null,
        remark: tx.remark,
        balance: tx.balance ? tx.balance.toNumber() : null,
      }));

      res.status(200).json(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to retrieve transactions." });
    }
  }
  static async ledger(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ message: "Unauthorized: User ID is required" });
        return;
      }
      const ledger = await prisma.fundTransaction.findMany({
        where: {
          userId: req.user?.userId,
          status: {
            in: [TransactionStatus.APPROVED],
          },
        },
        select: {
          id: true,
          createdAt: true,
          voucherType: true,
          Narration: true,
          debitAmount: true,
          creditAmount: true,
          balance: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(200).json(ledger);
    } catch (error) {
      console.error("Error fetching ledger:", error);
      res.status(500).json({ message: "Failed to retrieve ledger." });
    }
  }
}
