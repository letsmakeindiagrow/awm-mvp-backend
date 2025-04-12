import { z } from "zod";

export const registerUserSchema = z.object({
  referralCode: z.string().optional(),
  mobileNumber: z.string().min(10, "Mobile number must be 10 digits"),
  email: z.string().email("Invalid email format"),
  password: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.coerce.date(), // Converts input string to Date
  address: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      pincode: z.string().length(6, "Pincode must be 6 digits"),
    })
    .optional(),
  identityDetails: z
    .object({
      panNumber: z.string().length(10, "PAN must be 10 characters"),
      panAttachment: z.string().url("Invalid URL"),
      aadharNumber: z.string().length(12, "Aadhar number must be 12 digits"),
      aadharFront: z.string().url("Invalid URL"),
      aadharBack: z.string().url("Invalid URL"),
    })
    .optional(),
  bankDetails: z
    .object({
      accountNumber: z
        .string()
        .min(8, "Account number must be at least 8 digits"),
      ifscCode: z.string().length(11, "Invalid IFSC Code"),
      branchName: z.string(),
      proofAttachment: z.string().url("Invalid URL"),
    })
    .optional(),
});
// 🔹 Infer Type from Zod Schema
export type RegisterUserDto = z.infer<typeof registerUserSchema>;
