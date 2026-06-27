import { NextFunction, Request, Response } from "express";
import logger from "../logger.js";
import { AppError } from "../utils/AppError.js";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.statusCode || err.status || 500;
  
  const logContext = {
    err,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  };

  if (status >= 500) {
    logger.error(logContext, err.message || "Internal Server Error");
  } else {
    logger.info(logContext, err.message || "Client Error");
  }

  // If it's a known AppError or we are in development, send the actual message.
  // Otherwise, hide the message in production to prevent leaking sensitive info.
  const isSafeMessage = err instanceof AppError || process.env.NODE_ENV !== "production";
  const message = isSafeMessage ? err.message : "Internal Server Error";
  
  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}
