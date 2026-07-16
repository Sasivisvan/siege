// ============================================
// SIEGE Server — Session (Review) Routes
// ============================================

import { Router, Response } from 'express';
import { Session } from '../models/Session.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { recalculateSessionRisk } from '../services/riskEngine.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================
// GET /api/sessions — List Sessions (recruiter/admin)
// ============================================

router.get(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, minRisk, examId, page = '1', limit = '20' } = req.query;

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (examId) {
      filter.examId = examId;
    }

    if (status) {
      filter.status = status;
    }

    if (minRisk) {
      filter.riskScore = { $gte: parseInt(minRisk as string, 10) };
    }

    // For recruiters, only show sessions for exams they own
    if (req.user!.role === 'recruiter') {
      // We need to find exams owned by this recruiter first
      const { Exam } = await import('../models/Exam.js');
      const ownedExamIds = await Exam.find({ createdBy: req.user!.userId })
        .select('_id')
        .lean();
      filter.examId = { $in: ownedExamIds.map((e) => e._id) };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate('candidateId', 'name email')
        .populate('examId', 'title')
        .sort({ riskScore: -1 }) // Highest risk first
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Session.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  })
);

// ============================================
// GET /api/sessions/:sessionId/timeline — Event Timeline
// ============================================

router.get(
  '/:sessionId/timeline',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const events = await TelemetryEvent.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        candidateId: session.candidateId,
        status: session.status,
        events,
        count: events.length,
      },
    });
  })
);

// ============================================
// GET /api/sessions/:sessionId/risk — Risk Breakdown
// ============================================

router.get(
  '/:sessionId/risk',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Recalculate fresh risk score
    const riskScore = await recalculateSessionRisk(sessionId);

    res.status(200).json({
      success: true,
      data: riskScore,
    });
  })
);

// ============================================
// PATCH /api/sessions/:sessionId/lock — Lock/Unlock Session
// ============================================

router.patch(
  '/:sessionId/lock',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const { lock } = req.body; // true to lock, false to unlock

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (lock) {
      session.status = 'locked';
    } else {
      // Unlock → revert to active (only if not completed or flagged)
      if (session.status === 'locked') {
        session.status = 'active';
        session.lastHeartbeat = new Date(); // Reset heartbeat timer
      } else {
        throw new AppError(
          `Cannot unlock a session with status: ${session.status}`,
          400
        );
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: { session },
      message: lock ? 'Session locked' : 'Session unlocked',
    });
  })
);

export default router;
