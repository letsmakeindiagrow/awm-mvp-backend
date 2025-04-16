import express from "express";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  addFundsSchema,
  withdrawFundsSchema,
} from "../validation/funds.validation.js";
import { FundsController } from "../controller/funds.controller.js";
import { verifyRequest } from "../middleware/jwt.middleware.js";

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

router.get("/getTransactions/:userId", FundsController.getTransactions);

export default router;
