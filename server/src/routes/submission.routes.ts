// ============================================
// SIEGE Server — Submission Routes
// ============================================

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Submission } from '../models/Submission.js';
import { Session } from '../models/Session.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/submissions — Auto-save Answer (candidate)
// ============================================

router.post(
  '/',
  authenticate,
  authorize('candidate'),
  validate([
    body('sessionId').notEmpty().withMessage('sessionId is required'),
    body('questionId').notEmpty().withMessage('questionId is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, questionId, code, selectedOption } = req.body;

    // Verify session belongs to the candidate and is active
    const session = await Session.findOne({
      _id: sessionId,
      candidateId: req.user!.userId,
      status: 'active',
    });

    if (!session) {
      throw new AppError('Active session not found', 404);
    }

    // Upsert: create or update the submission for this question
    const submission = await Submission.findOneAndUpdate(
      { sessionId, questionId },
      {
        sessionId,
        questionId,
        code,
        selectedOption,
        submittedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: { submission },
    });
  })
);

// ============================================
// GET /api/submissions/:sessionId — Get Session Submissions (recruiter/admin)
// ============================================

router.get(
  '/:sessionId',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;

    // Verify the session's exam belongs to this recruiter
    const session = await Session.findById(sessionId).populate({
      path: 'examId',
      select: 'createdBy title',
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const exam = session.examId as unknown as { createdBy: string; title: string };
    if (req.user!.role !== 'admin' && exam.createdBy.toString() !== req.user!.userId) {
      throw new AppError('Unauthorized: you do not own this exam', 403);
    }

    const submissions = await Submission.find({ sessionId })
      .sort({ submittedAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        submissions,
        count: submissions.length,
      },
    });
  })
);

export default router;
