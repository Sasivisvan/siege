// ============================================
// SIEGE Server — Telemetry Routes
// ============================================

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { Session } from '../models/Session.js';
import { authenticate } from '../middleware/auth.js';
import { verifyHMAC } from '../middleware/hmac.js';
import { telemetryLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { recalculateSessionRisk } from '../services/riskEngine.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================
// POST /api/telemetry — Ingest Telemetry Batch
// ============================================

router.post(
  '/',
  telemetryLimiter,
  authenticate,
  validate([
    body('sessionId').notEmpty().withMessage('sessionId is required'),
    body('events').isArray({ min: 1 }).withMessage('events array is required'),
    body('events.*.eventType').notEmpty().withMessage('Each event must have an eventType'),
    body('events.*.timestamp').isNumeric().withMessage('Each event must have a timestamp'),
  ]),
  verifyHMAC,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, events } = req.body;

    // Get session (already validated by HMAC middleware)
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Bulk-insert telemetry events
    const telemetryDocs = events.map((event: {
      eventType: string;
      timestamp: number;
      metadata?: Record<string, unknown>;
      questionIndex?: number;
    }) => ({
      sessionId: session._id,
      candidateId: session.candidateId,
      examId: session.examId,
      timestamp: event.timestamp,
      eventType: event.eventType,
      metadata: event.metadata || {},
      questionIndex: event.questionIndex,
    }));

    await TelemetryEvent.insertMany(telemetryDocs);

    // Update heartbeat timestamp
    session.lastHeartbeat = new Date();
    await session.save();

    // Recalculate risk score server-side
    const riskScore = await recalculateSessionRisk(sessionId);

    res.status(200).json({
      success: true,
      data: {
        received: events.length,
        sessionRisk: riskScore.totalRisk,
      },
    });
  })
);

// ============================================
// POST /api/telemetry/heartbeat — Session Heartbeat
// ============================================

router.post(
  '/heartbeat',
  authenticate,
  validate([
    body('sessionId').notEmpty().withMessage('sessionId is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.body;

    const session = await Session.findOne({
      _id: sessionId,
      candidateId: req.user!.userId,
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // If session is locked, tell the client
    if (session.status === 'locked') {
      res.status(200).json({
        success: true,
        data: {
          status: 'locked',
          examLocked: true,
          message: 'Session is locked. Contact your proctor.',
        },
      });
      return;
    }

    // Update heartbeat
    session.lastHeartbeat = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        status: 'alive',
        examLocked: false,
      },
    });
  })
);

export default router;
