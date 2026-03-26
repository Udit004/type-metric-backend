import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.model.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return secret;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (!decoded.userId || typeof decoded.userId !== "string") {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(decoded.userId).select("_id").lean();

    if (!user?._id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.userId = String(user._id);
    req.userObjectId = user._id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
