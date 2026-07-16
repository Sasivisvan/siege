// ============================================
// SIEGE Server — Error Handling
// ============================================
// Custom AppError class and global error handler.
// Sanitizes errors in production, exposes stack in dev.
// ============================================

import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error with HTTP status code.
 * Use this for all intentional errors (validation, auth, not found, etc.)
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wrapper for async route handlers to catch promise rejections.
 * Eliminates the need for try/catch in every route.
 *
 * Usage: `router.get('/path', asyncHandler(async (req, res) => { ... }))`
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error-handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
export function globalErrorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 if no statusCode
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // Log the error
  if (!isOperational) {
    console.error('🔥 UNEXPECTED ERROR:', err);
  } else {
    console.error(`⚠️  ${statusCode} — ${err.message}`);
  }

  // Send response
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational || isDev ? err.message : 'Internal server error',
      ...(isDev && { stack: err.stack }),
    },
  });
}
