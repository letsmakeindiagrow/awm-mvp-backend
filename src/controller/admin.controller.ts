import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  PrismaClient,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

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
        process.env.JWT_SECRET || "",
        { expiresIn: "1h" }
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
        await prisma.fundTransaction.update({
          where: {
            id: transactionsId,
          },
          data: {
            status: TransactionStatus.APPROVED,
          },
        });

        res.status(200).json({
          message: "Transaction approved",
        });
      } else {
        await prisma.fundTransaction.update({
          where: {
            id: transactionsId,
            type: TransactionType.DEPOSIT,
          },
          data: {
            status: TransactionStatus.APPROVED,
          },
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
        await prisma.fundTransaction.update({
          where: {
            id: transactionsId,
            type: TransactionType.WITHDRAWAL,
          },
          data: {
            status: TransactionStatus.APPROVED,
          },
        });

        res.status(200).json({
          message: "Transaction approved",
        });
      } else {
        await prisma.fundTransaction.update({
          where: {
            id: transactionsId,
            type: TransactionType.WITHDRAWAL,
          },
          data: {
            status: TransactionStatus.APPROVED,
          },
        });
        res.status(200).json({
          message: "Transaction rejected",
        });
      }
    } catch (error) {
      console.error("Error in AdminController.withdrawFunds:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const transactions = await prisma.fundTransaction.findMany();
      res.status(200).json({ transactions });
    } catch (error) {
      console.error("Error in AdminController.getTransactions:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
}
