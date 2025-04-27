import express from "express";
import { AdminController } from "../controller/admin.controller.js";

const router = express.Router();

router.post("/login", AdminController.login);
router.post("/add-funds", AdminController.addFunds);
router.post("/withdraw-funds", AdminController.withdrawFunds);
router.get("/get-transactions", AdminController.getTransactions);
export default router;
