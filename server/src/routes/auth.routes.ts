// ============================================
// SIEGE Server — Auth Routes
// ============================================

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { User } from '../models/User.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest, JwtPayload } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/auth/register
// ============================================

router.post(
  '/register',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('role')
      .optional()
      .isIn(['candidate', 'recruiter', 'admin'])
      .withMessage('Role must be candidate, recruiter, or admin'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Create user
    const user = await User.create({ email, password, name, role });

    // Generate token
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const token = generateToken(payload);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toJSON(),
      },
    });
  })
);

// ============================================
// POST /api/auth/login
// ============================================

router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate token
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const token = generateToken(payload);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toJSON(),
      },
    });
  })
);

// ============================================
// GET /api/auth/me
// ============================================

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { user: user.toJSON() },
    });
  })
);

export default router;
