import express from "express";
import { AuthController } from "../controller/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  loginSchema,
  registerUserSchema,
} from "../validation/auth.validation.js";

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerUserSchema),
  AuthController.register
);
router.post("/verify-otp", AuthController.verifyEmailOTP);
router.post("/login", validateRequest(loginSchema), AuthController.login);

export default router;
