import { EmailResponse, sendEmail } from "../config/brevo.config.js";
import { EmailContent, EmailRecipient } from "../config/brevo.config.js";
import {
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
} from "../config/env.config.js";

if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY is not set");
}
if (!BREVO_SENDER_EMAIL) {
  throw new Error("BREVO_SENDER_EMAIL is not set");
}
if (!BREVO_SENDER_NAME) {
  throw new Error("BREVO_SENDER_NAME is not set");
}

export const sendConfirmationEmail = async (
  email: string,
  name: string,
  body: string
): Promise<EmailResponse> => {
  const recipient: EmailRecipient = { email, name };
  const content: EmailContent = {
    subject: "Confirm your Email",
    textContent: `Here is the OTP for Email Confirmation: ${body}`,
    htmlContent: `<p>Here is the OTP for Email Confirmation: <strong>${body}</strong></p>`,
  };
  return sendEmail(
    BREVO_API_KEY || "",
    BREVO_SENDER_EMAIL || "",
    BREVO_SENDER_NAME || "",
    recipient,
    content
  );
};
