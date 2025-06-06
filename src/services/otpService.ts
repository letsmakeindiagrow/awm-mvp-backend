import { PrismaClient } from "@prisma/client/edge";
import { randomInt } from "crypto";
import { sendConfirmationEmail } from "../services/brevoConformation.js";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

export class OTPService {
  // Generate a 6-digit OTP
  static generateOTP(): string {
    return randomInt(100000, 999999).toString();
  }

  // Create and send OTP for email verification
  static async sendEmailVerificationOTP(userId: string): Promise<string> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Delete any existing unverified OTPs for this user
    await prisma.oTP.deleteMany({
      where: {
        userId,
        type: "EMAIL_VERIFICATION",
        verified: false,
      },
    });

    // Generate OTP
    const otpCode = this.generateOTP();

    // Create new OTP record (expires in 10 minutes)
    await prisma.oTP.create({
      data: {
        userId,
        type: "EMAIL_VERIFICATION",
        code: otpCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      },
    });

    // Send OTP via email
    try {
      await sendConfirmationEmail(user.email, user.firstName, otpCode);
    } catch (error) {
      console.error("Error sending email OTP:", error);
      throw error;
    }

    return otpCode;
  }

  // Verify email OTP
  static async verifyEmailOTP(userId: string, code: string): Promise<boolean> {
    const otp = await prisma.oTP.findFirst({
      where: {
        userId,
        code,
        type: "EMAIL_VERIFICATION",
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) return false;

    // Mark OTP as verified and update user email verification status
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verificationState: "VERIFIED",
      },
    });

    return true;
  }
}
