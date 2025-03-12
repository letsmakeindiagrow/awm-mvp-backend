import express from "express";
import crypto from "crypto";
import axios from "axios";

const router = express.Router();

function generateHash(appId: string, appSecret: string) {
  const data = `${appId}:${appSecret}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

router.get("/callback", (req, res) => {
  const { auth_code, state } = req.query;
  res.redirect(
    `https://awm-mvp-frontend.onrender.com/fyers?auth_code=${auth_code}`
  );
});

router.post("/getToken", async (req, res: any) => {
  const { appId, appSecret, auth_code } = req.body;
  const hash = generateHash(appId, appSecret);
  const response = await axios.post(
    "https://api-t1.fyers.in/api/v3/validate-authcode",
    {
      grant_type: "authorization_code",
      appIdHash: hash,
      code: auth_code,
    }
  );
  return res.json(response.data);
});

export default router;
