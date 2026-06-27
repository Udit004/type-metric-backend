import { NextFunction, Request, Response } from "express";
import logger from "../logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;

    const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs,
    };

    if (res.statusCode >= 500) {
        logger.error(logData);
    } else if (res.statusCode >= 400) {
        logger.warn(logData);
    } else {
        logger.info(logData);
    }
});

  next();
}
