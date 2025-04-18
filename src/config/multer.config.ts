import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "./aws.config.js";
import path from "path";

export const uploader = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME as string,
    metadata: (req: any, file: Express.Multer.File, cb: any) => {
      cb(null, { documentType: req.body.documentType });
    },
    key: (req: any, file: Express.Multer.File, cb: any) => {
      // Generate unique filename with timestamp and random number
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${req.body.documentType}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    // Validate file types
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, and PDF files are allowed."
        )
      );
    }
  },
});
