import express from "express";
import { AdminController } from "../controller/admin.controller.js";
import { verifyRequest } from "../middleware/admin.verify.js";

const router = express.Router();

router.post("/login", AdminController.login);
router.post("/add-funds", verifyRequest, AdminController.addFunds);
router.post("/withdraw-funds", verifyRequest, AdminController.withdrawFunds);
router.get("/get-transactions", verifyRequest, AdminController.getTransactions);
router.get("/get-users", verifyRequest, AdminController.getUsers);
router.post("/verify-user", verifyRequest, AdminController.verifyUser);
router.get("/get-user/:userId", verifyRequest, AdminController.getUserById);
router.post(
  "/create-investment-plan",
  verifyRequest,
  AdminController.createInvestmentPlan
);
router.get(
  "/get-investment-plans",
  verifyRequest,
  AdminController.getInvestmentPlans
);
export default router;
