import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import fyer from "./routes/fyers.routes.js";
import investor from "./routes/investor.routes.js";
import uploadRoute from "./routes/upload.route.js";
import adminRoutes from "./routes/admin.routes.js";

const allowedOrigins = [
  "https://login.aadyanviwealth.com",
  "https://investor.aadyanviwealth.com",
  "https://www.aadyanviwealth.com",
  "http://localhost:5173",
];

const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, origin);
      } else {
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
