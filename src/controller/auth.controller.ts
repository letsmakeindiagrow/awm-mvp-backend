import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterUserDto } from "../validation/auth.validation.js";
import { OTPService } from "../services/otpService.js";

const prisma = new PrismaClient();

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
      // const saltRounds = 10;
      // const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user with base information first
      const user = await prisma.user.create({
        data: {
          referralCode: userData.referralCode,
          mobileNumber: userData.mobileNumber,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth,
          // password: hashedPassword, // Store hashed password
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
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "24h",
      });

      // Automatically send email verification OTP
      await OTPService.sendEmailVerificationOTP(user.id);

      res.status(201).json({
        message: "Registration successful. Please verify your email.",
        token,
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
}
