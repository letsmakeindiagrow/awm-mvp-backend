import nodemailer from "nodemailer";
import { EMAIL_HOST, EMAIL_PORT } from "../config/env.config.js";

export const sendConfirmationEmail = async (
  email: string,
  body: string,
  type: string
) => {
  console.log("Sending email to", email);
  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
    });
    let mailOptions;

    if (type === "EMAIL_VERIFICATION") {
      mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Confirm your Email",
        text: `Here is the OTP for Email Confirmation: ${body}`,
        html: `<p>Here is the OTP for Email Confirmation: <strong>${body}</strong></p>`,
      };
    } else {
      throw new Error("Invalid email type");
    }

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email", error);
  }
};
