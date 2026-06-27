import { NextFunction, Request, Response } from "express";
import logger from "../logger.js";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Log the error
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
    },
    err.message || "Internal Server Error"
  );

  // Send a generic response in production
  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message;
  
  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}
