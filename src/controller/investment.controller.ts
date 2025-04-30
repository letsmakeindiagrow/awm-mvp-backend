import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";
import { subscribeInvestmentType } from "../validation/investment.validation.js";
import { addYears } from "date-fns";

const prisma = new PrismaClient();

export class InvestmentController {
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

      if (investmentPlan.type !== "SIP") {
        res.status(400).json({ message: "Investment plan is not a SIP" });
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
            investmentMode: payload.investmentMode,
            withdrawalFrequency: payload.withdrawalFrequency,
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
}
