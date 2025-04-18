import express from "express";
import { Request, Response } from "express";
import { uploader } from "../config/multer.config.js";

const router = express.Router();

router.post(
  "/upload",
  uploader.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      if (!req.body.documentType) {
        res.status(400).json({ error: "Document type is required" });
        return;
      }

      const fileUrl = (req.file as any).location;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
