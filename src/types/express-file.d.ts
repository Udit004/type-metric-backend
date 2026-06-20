import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    file?: {
      buffer?: Buffer;
      mimetype?: string;
      originalname?: string;
      size?: number;
      fieldname?: string;
    };
    files?: unknown;
  }
}
