import express from "express";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  addFundsSchema,
  withdrawFundsSchema,
} from "../validation/funds.validation.js";
import { FundsController } from "../controller/funds.controller.js";

const router = express.Router();

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

export default router;
