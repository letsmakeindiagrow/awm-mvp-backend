import { Request, Response } from "express";
import {
  PrismaClient,
  TransactionMethod,
  TransactionType,
} from "@prisma/client";
import {
  addFundType,
  withdrawFundType,
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
          referenceNumber: payload.referenceNumber,
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
}
