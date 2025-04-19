import { Request, Response, NextFunction } from "express";
import { jwtPayloadType } from "../validation/auth.validation.js";
import jwt from "jsonwebtoken";

declare module "express" {
  export interface Request {
    user?: jwtPayloadType;
  }
}

export const verifyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const JWT_SECRET = process.env.JWT_SECRET;
  try {
    const token = req.cookies.auth_token; // <-- GET TOKEN FROM COOKIE

    if (!token) {
      res.status(401).json({ message: "Unauthorized: Token is missing" });
      return;
    }

    if (!JWT_SECRET) {
      res
        .status(500)
        .json({ message: "Server configuration error: Missing JWT_SECRET" });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "email" in decoded &&
        "userId" in decoded
      ) {
        req.user = decoded as jwtPayloadType;
        next();
      } else {
        res.status(401).json({ message: "Invalid Token Structure" });
        return;
      }
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ message: "Invalid Token" });
    }
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({
      message: "Internal server error during request verification",
    });
  }
};
