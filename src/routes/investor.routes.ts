import express from "express";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  addFundsSchema,
  withdrawFundsSchema,
} from "../validation/funds.validation.js";
import { FundsController } from "../controller/funds.controller.js";
import { verifyRequest } from "../middleware/jwt.middleware.js";
import { subscribeInvestmentSchema } from "../validation/investment.validation.js";
import { InvestmentController } from "../controller/investment.controller.js";
const router = express.Router();
router.use(verifyRequest);

router.post(
  "/addFunds",
  validateRequest(addFundsSchema),
  FundsController.addFunds
);

router.post(
  "/withdrawFunds",
  validateRequest(withdrawFundsSchema),
  FundsController.withdrawFunds
);

router.post(
  "/subscribeInvestment",
  validateRequest(subscribeInvestmentSchema),
  InvestmentController.subscribeInvestment
);

router.get("/getInvestments", InvestmentController.getUserInvestments);

router.get("/getTransactions", FundsController.getTransactions);

router.get("/getInvestmentPlans", InvestmentController.getInvestmentPlans);

router.get("/getBalance", InvestmentController.getBalance);

router.get("/ledger", FundsController.ledger);

router.post("/withdrawPreMaturity", InvestmentController.withdrawPreMaturity);

export default router;
