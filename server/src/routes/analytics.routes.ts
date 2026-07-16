// ============================================
// SIEGE Server — Analytics Routes
// ============================================

import { Router, Response } from 'express';
import { Session } from '../models/Session.js';
import { Submission } from '../models/Submission.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { Exam } from '../models/Exam.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { RISK_THRESHOLDS } from '../types/index.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================
// GET /api/analytics/exam/:examId — Exam Analytics
// ============================================

router.get(
  '/exam/:examId',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { examId } = req.params;

    // Verify exam exists and belongs to this user
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (
      req.user!.role !== 'admin' &&
      exam.createdBy.toString() !== req.user!.userId
    ) {
      throw new AppError('Unauthorized: you do not own this exam', 403);
    }

    // Get all sessions for this exam
    const sessions = await Session.find({ examId }).lean();

    const totalCandidates = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const completionRate =
      totalCandidates > 0
        ? Math.round((completedSessions.length / totalCandidates) * 100)
        : 0;

    // Risk distribution
    const riskDistribution = {
      clean: sessions.filter((s) => s.riskScore < RISK_THRESHOLDS.LOW).length,
      low: sessions.filter(
        (s) =>
          s.riskScore >= RISK_THRESHOLDS.LOW &&
          s.riskScore < RISK_THRESHOLDS.MEDIUM
      ).length,
      medium: sessions.filter(
        (s) =>
          s.riskScore >= RISK_THRESHOLDS.MEDIUM &&
          s.riskScore < RISK_THRESHOLDS.HIGH
      ).length,
      high: sessions.filter(
        (s) =>
          s.riskScore >= RISK_THRESHOLDS.HIGH &&
          s.riskScore < RISK_THRESHOLDS.CRITICAL
      ).length,
      critical: sessions.filter(
        (s) => s.riskScore >= RISK_THRESHOLDS.CRITICAL
      ).length,
    };

    // Average risk
    const averageRisk =
      totalCandidates > 0
        ? Math.round(
            sessions.reduce((sum, s) => sum + s.riskScore, 0) /
              totalCandidates
          )
        : 0;

    // Flagged count
    const flaggedCount = sessions.filter(
      (s) => s.status === 'flagged'
    ).length;

    // Top 10 highest risk sessions
    const topRiskSessions = await Session.find({ examId })
      .populate('candidateId', 'name email')
      .sort({ riskScore: -1 })
      .limit(10)
      .lean();

    // Plagiarism summary
    const allSessionIds = sessions.map((s) => s._id);
    const plagiarizedSubmissions = await Submission.countDocuments({
      sessionId: { $in: allSessionIds },
      plagiarismScore: { $gte: 0.60 },
    });

    const highPlagiarismSubmissions = await Submission.countDocuments({
      sessionId: { $in: allSessionIds },
      plagiarismScore: { $gte: 0.85 },
    });

    // Event type breakdown across all sessions
    const eventBreakdown = await TelemetryEvent.aggregate([
      { $match: { examId: exam._id } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          eventType: '$_id',
          totalEvents: '$count',
          affectedSessions: { $size: '$uniqueSessions' },
          _id: 0,
        },
      },
      { $sort: { totalEvents: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        exam: {
          id: exam._id,
          title: exam.title,
          totalQuestions: exam.questions.length,
          duration: exam.duration,
        },
        overview: {
          totalCandidates,
          completedCount: completedSessions.length,
          completionRate: `${completionRate}%`,
          averageRisk,
          flaggedCount,
        },
        riskDistribution,
        topRiskSessions: topRiskSessions.map((s) => ({
          sessionId: s._id,
          candidate: s.candidateId,
          riskScore: s.riskScore,
          status: s.status,
          startedAt: s.startedAt,
        })),
        plagiarism: {
          suspiciousSubmissions: plagiarizedSubmissions,
          confirmedPlagiarism: highPlagiarismSubmissions,
        },
        eventBreakdown,
      },
    });
  })
);

export default router;
