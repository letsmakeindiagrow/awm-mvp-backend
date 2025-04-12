import { Request, Response } from "express";
import {
  PrismaClient,
  TransactionMethod,
  TransactionType,
} from "@prisma/client";
import {
  addFundType,
  withdrawFundType,
  TransactionTypes,
} from "../validation/funds.validation.js";

const prisma = new PrismaClient();

export class FundsController {
  static async addFunds(req: Request, res: Response): Promise<void> {
    try {
      const payload: addFundType = req.body;
      await prisma.fundTransaction.create({
        data: {
          userId: payload.userId,
          amount: payload.amount,
          type: TransactionType.DEPOSIT,
          method: payload.paymentMethod,
          referenceNumber: parseInt(payload.referenceNumber, 10),
          remark: payload.comments,
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
      const payload: withdrawFundType = req.body;
      await prisma.fundTransaction.create({
        data: {
          userId: payload.userId,
          amount: payload.amount,
          type: TransactionType.WITHDRAWAL,
          method: TransactionMethod.NEFT,
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
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ message: "User ID is required." });
        return;
      }

      const transactions = await prisma.fundTransaction.findMany({
        where: {
          userId: userId,
        },
        select: {
          id: true,
          createdAt: true,
          method: true,
          type: true,
          amount: true,
          referenceNumber: true,
          remark: true,
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
        amount: tx.amount.toNumber(),
        refNumber: tx.referenceNumber ? tx.referenceNumber.toString() : null,
        remark: tx.remark,
      }));

      res.status(200).json(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to retrieve transactions." });
    }
  }
}
