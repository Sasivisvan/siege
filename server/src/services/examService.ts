// ============================================
// SIEGE Server — Exam Service
// ============================================
// Business logic for exam lifecycle management.
// ============================================

import crypto from 'crypto';
import { Exam, IExamDocument } from '../models/Exam.js';
import { Session } from '../models/Session.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Fisher-Yates shuffle for randomizing question order.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Start an exam session for a candidate.
 * Creates a session, generates per-session HMAC secret,
 * and returns the exam data (with randomized questions if enabled).
 */
export async function startExamSession(
  examId: string,
  candidateId: string
) {
  // Find the exam
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  // Check if candidate already has an active session for this exam
  const existingSession = await Session.findOne({
    examId,
    candidateId,
    status: { $in: ['active', 'completed'] },
  });

  if (existingSession) {
    if (existingSession.status === 'active') {
      throw new AppError('You already have an active session for this exam', 409);
    }
    throw new AppError('You have already completed this exam', 409);
  }

  // Generate per-session HMAC secret
  const hmacSecret = crypto.randomBytes(32).toString('hex');

  // Create session
  const session = await Session.create({
    examId,
    candidateId,
    hmacSecret,
    lastHeartbeat: new Date(),
  });

  // Prepare exam data for the candidate
  let questions = exam.questions.map((q) => {
    const questionData: Record<string, unknown> = {
      id: q._id,
      type: q.type,
      title: q.title,
      description: q.description,
      points: q.points,
      timeLimit: q.timeLimit,
    };

    // Include options for MCQ/aptitude (but NOT the correct answer)
    if (q.options) {
      questionData.options = q.options;
    }

    // Include visible test cases only for coding questions
    if (q.testCases) {
      questionData.testCases = q.testCases.filter((tc) => !tc.isHidden);
    }

    return questionData;
  });

  // Randomize if setting enabled
  if (exam.settings.randomizeQuestions) {
    questions = shuffleArray(questions);
  }

  return {
    sessionId: session._id.toString(),
    hmacSecret, // Sent to client ONCE, used for telemetry signing
    exam: {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      settings: exam.settings,
      questions,
    },
  };
}

/**
 * Submit/complete an exam session.
 */
export async function submitExamSession(
  sessionId: string,
  candidateId: string
) {
  const session = await Session.findOne({ _id: sessionId, candidateId });

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.status !== 'active') {
    throw new AppError(`Session is already ${session.status}`, 400);
  }

  session.status = 'completed';
  session.endedAt = new Date();
  await session.save();

  return session;
}
