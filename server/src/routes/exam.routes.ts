// ============================================
// SIEGE Server — Exam Routes
// ============================================

import { Router, Response } from 'express';
import { body } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import { Exam } from '../models/Exam.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { startExamSession, submitExamSession } from '../services/examService.js';
import { checkPlagiarism } from '../services/plagiarism.js';
import { Submission } from '../models/Submission.js';
import { Classroom } from '../models/Classroom.js';
import type { AuthenticatedRequest } from '../types/index.js';

/** Strip all HTML tags from user-provided text fields to prevent stored XSS */
function sanitizeText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

const router = Router();

// ============================================
// POST /api/exams — Create Exam (recruiter/admin)
// ============================================

router.post(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  validate([
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').notEmpty().withMessage('Description is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
    body('questions.*.type')
      .isIn(['coding', 'mcq', 'aptitude'])
      .withMessage('Question type must be coding, mcq, or aptitude'),
    body('questions.*.title').notEmpty().withMessage('Question title is required'),
    body('questions.*.description').notEmpty().withMessage('Question description is required'),
    body('questions.*.points').isInt({ min: 1 }).withMessage('Points must be at least 1'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { classroomId, ...examData } = req.body;

    // Optional: if a classroomId is provided, verify the user owns it
    let classroom = null;
    if (classroomId) {
      classroom = await Classroom.findOne({ _id: classroomId, teacher: req.user!.userId });
      if (!classroom) {
        throw new AppError('Classroom not found or unauthorized', 404);
      }
    }

    const exam = await Exam.create({
      ...examData,
      title: sanitizeText(examData.title),
      description: sanitizeText(examData.description),
      questions: examData.questions?.map((q: any) => ({
        ...q,
        title: sanitizeText(q.title),
        description: sanitizeText(q.description),
      })),
      createdBy: req.user!.userId,
    });

    if (classroom) {
      classroom.exams.push(exam._id as any);
      await classroom.save();
    }

    res.status(201).json({
      success: true,
      data: { exam },
    });
  })
);

// ============================================
// GET /api/exams — List Exams (recruiter/admin)
// ============================================

router.get(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const exams = await Exam.find({ createdBy: req.user!.userId })
      .select('-questions.correctOption -questions.testCases')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { exams, count: exams.length },
    });
  })
);

// ============================================
// GET /api/exams/:examId — Get Exam Details
// ============================================

router.get(
  '/:examId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Candidates get a stripped version — use projection for defense-in-depth
    if (req.user!.role === 'candidate') {
      const exam = await Exam.findById(req.params.examId)
        .select('-questions.correctOption -questions.testCases');
      if (!exam) {
        throw new AppError('Exam not found', 404);
      }
      // Re-add only visible test cases via service layer (examService handles this at start)
      res.status(200).json({ success: true, data: { exam } });
      return;
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    res.status(200).json({ success: true, data: { exam } });
  })
);

// ============================================
// PUT /api/exams/:examId — Update Exam
// ============================================

router.put(
  '/:examId',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Whitelist mutable fields to prevent NoSQL injection / field overwrite
    const { title, description, duration, questions, settings } = req.body;
    const allowedUpdates: Record<string, unknown> = {};
    if (title !== undefined) allowedUpdates.title = title;
    if (description !== undefined) allowedUpdates.description = description;
    if (duration !== undefined) allowedUpdates.duration = duration;
    if (questions !== undefined) allowedUpdates.questions = questions;
    if (settings !== undefined) allowedUpdates.settings = settings;

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.examId, createdBy: req.user!.userId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!exam) {
      throw new AppError('Exam not found or unauthorized', 404);
    }

    res.status(200).json({ success: true, data: { exam } });
  })
);

// ============================================
// DELETE /api/exams/:examId — Delete Exam
// ============================================

router.delete(
  '/:examId',
  authenticate,
  authorize('recruiter', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.examId,
      createdBy: req.user!.userId,
    });

    if (!exam) {
      throw new AppError('Exam not found or unauthorized', 404);
    }

    res.status(200).json({ success: true, message: 'Exam deleted' });
  })
);

// ============================================
// POST /api/exams/:examId/start — Start Exam (candidate)
// ============================================

router.post(
  '/:examId/start',
  authenticate,
  authorize('candidate'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await startExamSession(req.params.examId, req.user!.userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

// ============================================
// POST /api/exams/:examId/submit — Submit Exam (candidate)
// ============================================

router.post(
  '/:examId/submit',
  authenticate,
  authorize('candidate'),
  validate([
    body('sessionId').notEmpty().withMessage('Session ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const session = await submitExamSession(
      req.body.sessionId,
      req.user!.userId
    );

    // Trigger async plagiarism check — fire-and-forget with proper error handling
    void (async () => {
      try {
        const submissions = await Submission.find({
          sessionId: session._id,
          code: { $exists: true, $ne: null },
        });

        for (const submission of submissions) {
          await checkPlagiarism(submission._id.toString());
        }
        console.log(`✅ Plagiarism check complete for session ${session._id}`);
      } catch (error) {
        console.error(`❌ Plagiarism check failed for session ${session._id}:`, error);
      }
    })();

    res.status(200).json({
      success: true,
      data: { session },
      message: 'Exam submitted. Plagiarism analysis running in background.',
    });
  })
);

export default router;
