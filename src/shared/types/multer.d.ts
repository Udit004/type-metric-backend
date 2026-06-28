declare module "multer" {
  import { RequestHandler } from "express";

  export interface File {
    /** Raw bytes from memoryStorage */
    buffer?: Buffer;
    mimetype?: string;
    originalname?: string;
    size?: number;
    fieldname?: string;
  }

  export interface MulterError extends Error {}

  export interface StorageEngine {}

  export interface Multer {
    single(fieldName: string): RequestHandler;
  }

  export interface MulterOptions {
    storage?: StorageEngine;
    limits?: {
      fileSize?: number;
    };
  }

  export function memoryStorage(): StorageEngine;

  const multer: {
    (options?: MulterOptions): Multer;
    memoryStorage: typeof memoryStorage;
  };

  export default multer;
}
