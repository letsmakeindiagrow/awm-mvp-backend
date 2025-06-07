import express from "express";
import { AdminController } from "../controller/admin.controller.js";
import { verifyRequest } from "../middleware/admin.verify.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { uploader } from "../config/multer.config.js";
import {
  createInvestmentPlanSchema,
  createNewUserSchema,
  editInvestmentPlanSchema,
  planStatusSchema,
} from "../validation/admin.validation.js";

const router = express.Router();

router.post("/login", AdminController.login);
router.post("/add-funds", verifyRequest, AdminController.addFunds);
router.post("/withdraw-funds", verifyRequest, AdminController.withdrawFunds);
router.get(
  "/get-deposit-transactions",
  verifyRequest,
  AdminController.getDepositTransactions
);
router.get("/get-users", verifyRequest, AdminController.getUsers);
router.post("/verify-user", verifyRequest, AdminController.verifyUser);
router.get("/get-user/:userId", verifyRequest, AdminController.getUserById);
router.post(
  "/create-investment-plan",
  validateRequest(createInvestmentPlanSchema),
  verifyRequest,
  AdminController.createInvestmentPlan
);
router.get(
  "/get-investment-plans",
  verifyRequest,
  AdminController.getInvestmentPlans
);
router.get(
  "/get-withdrawal-transactions",
  verifyRequest,
  AdminController.getWithdrawalTransactions
);
router.get("/aum", verifyRequest, AdminController.aum);
router.get("/getUnusedFunds", verifyRequest, AdminController.getUnusedFunds);
router.get("/pendingRequests", verifyRequest, AdminController.pendingRequests);
router.get("/activePlans", verifyRequest, AdminController.activePlans);
router.get("/activeInvestors", verifyRequest, AdminController.activeInvestors);
router.post("/logout", AdminController.logout);
router.get("/checkAuth", AdminController.checkAuth);
router.delete(
  "/deletePlan/:planId",
  verifyRequest,
  AdminController.deleteInvestmentPlan
);
router.post(
  "/planStatus",
  validateRequest(planStatusSchema),
  verifyRequest,
  AdminController.planStatus
);
router.post(
  "/edit-investment-plan",
  validateRequest(editInvestmentPlanSchema),
  verifyRequest,
  AdminController.editInvestmentPlan
);
router.post(
  "/create-user",
  verifyRequest,
  uploader.fields([
    { name: 'panAttachment', maxCount: 1 },
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'bankProof', maxCount: 1 }
  ]),
  validateRequest(createNewUserSchema),
  AdminController.createNewUser
);
export default router;
