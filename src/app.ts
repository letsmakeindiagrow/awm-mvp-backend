import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import fyer from "./routes/fyers.routes.js";
import investor from "./routes/investor.routes.js";
import uploadRoute from "./routes/upload.route.js";
import adminRoutes from "./routes/admin.routes.js";
import { sendEmail } from "./config/brevo.config.js";

const allowedOrigins = [
  "https://login.aadyanviwealth.com",
  "https://investor.aadyanviwealth.com",
  "https://admin.aadyanviwealth.com",
  "https://www.aadyanviwealth.com",
  "https://login.local.com",
  "https://dashboard.local.com",
  "https://vercel.com/aadyanvi-wealth-managements-projects/investor-dashboard-awm/F9EovXtwUbj6sNV4LW2HTg8KpECC",
];

const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      // console.log("CORS Middleware: Request Origin Header:", origin);
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        // console.log("CORS Middleware: Origin ALLOWED:", origin);
        callback(null, origin);
      } else {
        // console.log("CORS Middleware: Origin DENIED:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/fyers", fyer);
app.use("/api/v1/investor", investor);
app.use("/api/v1/documents", uploadRoute);
app.use("/api/v1/admin", adminRoutes);

app.post(
  "/test-email",
  async function (req: express.Request, res: express.Response): Promise<void> {
    try {
      const { apiKey, senderEmail, senderName, recipientEmail } = req.body;

      if (!apiKey || !senderEmail || !senderName || !recipientEmail) {
        res.status(400).json({
          success: false,
          error: "Missing required fields in the request body",
        });
        return;
      }

      const htmlContent = "<p>This is a test email</p>";

      const result = await sendEmail(
        apiKey,
        senderEmail,
        senderName,
        {
          email: recipientEmail,
          name: "rahul",
        },
        {
          subject: "Test Email",
          htmlContent,
        }
      );

      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to send email",
        details: error.message,
      });
    }
  }
);

export default app;
