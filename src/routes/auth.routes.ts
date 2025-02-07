import express from "express";
import { AuthController } from "../controller/auth.controller";
import { validateRequest } from "../middleware/validateRequest";
import { registerUserSchema } from "../validation/auth.validation";

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerUserSchema),
  AuthController.register
);

export default router;
