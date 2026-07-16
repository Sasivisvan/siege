// ============================================
// SIEGE Server — Profile Routes
// ============================================

import { Router, Response } from 'express';
import { SkillProfile } from '../models/SkillProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================
// GET /api/profile — Get Candidate Skill Profile
// ============================================
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let targetUserId = req.user!.userId;

    // Allow recruiters and admins to query other users' profiles
    if (req.query.userId) {
      if (req.user!.role === 'candidate') {
        throw new AppError('Unauthorized to view other profiles', 403);
      }
      targetUserId = req.query.userId as string;
    }

    const profile = await SkillProfile.findOne({ userId: targetUserId })
      .populate('userId', 'name email role');

    if (!profile) {
      // Return an empty profile template if none exists yet
      return res.status(200).json({
        success: true,
        data: {
          profile: {
            userId: targetUserId,
            topicScores: [],
            overallStrengths: [],
            overallWeaknesses: [],
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: { profile },
    });
  })
);

export default router;
