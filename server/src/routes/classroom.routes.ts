// ============================================
// SIEGE Server — Classroom Routes
// ============================================

import { Router, Response } from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import { Classroom } from '../models/Classroom.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

/**
 * Generate a random 6-character alphanumeric join code
 */
function generateJoinCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ============================================
// POST /api/classrooms — Create Classroom (recruiter/admin)
// ============================================

router.post(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  validate([
    body('name').notEmpty().withMessage('Name is required').trim(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Generate a unique join code
    let joinCode = generateJoinCode();
    while (await Classroom.findOne({ joinCode })) {
      joinCode = generateJoinCode();
    }

    const classroom = await Classroom.create({
      name: req.body.name,
      joinCode,
      teacher: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      data: { classroom },
    });
  })
);

// ============================================
// GET /api/classrooms — List Classrooms
// ============================================

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let classrooms;

    if (req.user!.role === 'candidate') {
      // Find classrooms where the student is in the students array
      classrooms = await Classroom.find({ students: req.user!.userId })
        .populate('teacher', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Find classrooms created by this teacher
      classrooms = await Classroom.find({ teacher: req.user!.userId })
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      data: { classrooms, count: classrooms.length },
    });
  })
);

// ============================================
// POST /api/classrooms/join — Join Classroom (candidate)
// ============================================

router.post(
  '/join',
  authenticate,
  authorize('candidate'),
  validate([
    body('joinCode').notEmpty().withMessage('Join code is required').trim().toUpperCase(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { joinCode } = req.body;

    const classroom = await Classroom.findOne({ joinCode });
    if (!classroom) {
      throw new AppError('Invalid join code', 404);
    }

    // Check if already a student
    if (classroom.students.includes(req.user!.userId as any)) {
      throw new AppError('You have already joined this classroom', 400);
    }

    classroom.students.push(req.user!.userId as any);
    await classroom.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined classroom',
      data: { classroom },
    });
  })
);

// ============================================
// GET /api/classrooms/:id — Get Classroom Details (and its exams)
// ============================================

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const classroom = await Classroom.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('exams', 'title duration points createdAt'); // Basic exam info

    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    // Verify access
    if (req.user!.role === 'candidate') {
      if (!classroom.students.some(id => id.toString() === req.user!.userId)) {
        throw new AppError('Unauthorized', 403);
      }
    } else if (req.user!.role === 'recruiter') {
      if (classroom.teacher._id.toString() !== req.user!.userId) {
        throw new AppError('Unauthorized', 403);
      }
    }

    res.status(200).json({
      success: true,
      data: { classroom },
    });
  })
);

export default router;
