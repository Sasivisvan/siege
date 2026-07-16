// ============================================
// SIEGE Server — Authentication Middleware
// ============================================
// JWT verification and role-based access control.
// ============================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import type { AuthenticatedRequest, JwtPayload, UserRole } from '../types/index.js';

/**
 * Authenticate a request by verifying the JWT token.
 * Attaches the decoded user payload to `req.user`.
 */
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid token format.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired. Please log in again.', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token. Please log in again.', 401));
    } else {
      next(new AppError('Authentication failed.', 401));
    }
  }
}

/**
 * Authorize access based on user roles.
 * Must be used AFTER `authenticate` middleware.
 *
 * Usage: `router.post('/path', authenticate, authorize('admin', 'recruiter'), handler)`
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}
