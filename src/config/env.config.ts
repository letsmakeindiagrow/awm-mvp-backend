import dotenv from "dotenv";

dotenv.config();

export const BREVO_API_KEY = process.env.BREVO_API_KEY;
export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;

if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY environment variable is not set");
}
if (!BREVO_SENDER_EMAIL) {
  throw new Error("BREVO_SENDER_EMAIL environment variable is not set");
}
