import express from "express";
import { AuthController } from "../controller/auth.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { registerUserSchema } from "../validation/auth.validation.js";

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerUserSchema),
  AuthController.register
);

export default router;
