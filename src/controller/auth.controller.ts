import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  loginSchemaType,
  RegisterUserDto,
} from "../validation/auth.validation.js";
import { OTPService } from "../services/otpService.js";

const prisma = new PrismaClient();
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN; // Define COOKIE_DOMAIN from environment variables
const COOKIE_NAME = process.env.COOKIE_NAME; // Define COOKIE_NAME from environment variables

if (!COOKIE_DOMAIN) {
  // console.error("Error: COOKIE_DOMAIN environment variable is not set.");
  throw new Error("FATAL: COOKIE_DOMAIN environment variable is not set.");
}

if (!COOKIE_NAME) {
  // console.error("Error: COOKIE_NAME environment variable is not set.");
  throw new Error("FATAL: COOKIE_NAME environment variable is not set.");
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterUserDto = req.body;

      // Check for existing user
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { mobileNumber: userData.mobileNumber },
          ],
        },
      });

      if (existingUser) {
        res.status(400).json({
          message: "User already exists with this email or mobile number",
        });
        return;
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user with base information first
      const user = await prisma.user.create({
        data: {
          referralCode: userData.referralCode,
          mobileNumber: userData.mobileNumber,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth,
          password: hashedPassword, // Store hashed password
          verificationState: "PENDING",
          mobileVerified: false,
          emailVerified: false,
        },
      });

      // If address is provided, create it
      if (userData.address) {
        await prisma.address.create({
          data: {
            userId: user.id,
            ...userData.address,
          },
        });
      }

      // If identity details are provided, create them
      if (userData.identityDetails) {
        await prisma.identityDetails.create({
          data: {
            userId: user.id,
            ...userData.identityDetails,
          },
        });
      }

      // If bank details are provided, create them
      if (userData.bankDetails) {
        await prisma.bankDetails.create({
          data: {
            userId: user.id,
            ...userData.bankDetails,
          },
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        {
          expiresIn: "10h",
        }
      );
      console.log("Setting cookie with options:", `${COOKIE_DOMAIN}`);
      console.log(`DEBUG: Using COOKIE_NAME = '${COOKIE_NAME}'`); // Added for debugging
      res.cookie(COOKIE_NAME!, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        domain: COOKIE_DOMAIN, // Crucial: Set correct domain
        path: "/",
        maxAge: 10 * 60 * 60 * 1000, // 10 hours
      });

      // Automatically send email verification OTP
      await OTPService.sendEmailVerificationOTP(user.id);

      res.status(201).json({
        message: "Registration successful. Please verify your email.",
        user: {
          id: user.id,
          email: user.email,
          mobileNumber: user.mobileNumber,
          verificationState: user.verificationState,
        },
        emailVerification: {
          otpSent: true,
          expiresIn: 10 * 60, // 10 minutes
        },
      });
      return;
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
      return;
    }
  }
  static async verifyEmailOTP(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      const { otp } = req.body;

      // Verify OTP
      const isVerified = await OTPService.verifyEmailOTP(userId, otp);

      if (isVerified) {
        res.status(200).json({
          message: "Email verified successfully",
          emailVerified: true,
        });
        return;
      }

      res.status(400).json({
        message: "Invalid or expired OTP",
      });
    } catch (error) {
      console.error("Email OTP verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  }
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const creds: loginSchemaType = req.body;

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: creds.email,
            mode: "insensitive",
          },
        },
      });

      if (!user) {
        res.status(400).json({
          message: "user not found",
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(
        creds.password,
        user.password
      );

      if (!isPasswordValid) {
        res.status(400).json({
          message: "invalid email or password",
        });
        return;
      }
      if (!process.env.JWT_SECRET) {
        res.status(400).json({
          message: "JWT Secret not defined",
        });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "10h",
        }
      );

      res.cookie(COOKIE_NAME!, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        domain: COOKIE_DOMAIN,
        maxAge: 10 * 60 * 60 * 1000, // 10 hours
      });

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
