import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userObjectId?: Types.ObjectId;
    }
  }
}

export {};
