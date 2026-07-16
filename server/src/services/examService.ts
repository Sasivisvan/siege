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

  // Check if candidate already has a session for this exam
  let session: any = await Session.findOne({
    examId,
    candidateId,
  }).select('+hmacSecret');

  if (session) {
    if (session.status === 'active') {
      // Resume the existing active session
      // (Do not throw an error, we will just return the existing session data below)
    } else {
      throw new AppError(`You cannot start this exam because your session is ${session.status}`, 409);
    }
  } else {
    // Generate per-session HMAC secret
    const hmacSecret = crypto.randomBytes(32).toString('hex');

    try {
      // Create session
      session = await Session.create({
        examId,
        candidateId,
        hmacSecret,
        lastHeartbeat: new Date(),
      });
    } catch (error: any) {
      if (error.code === 11000) {
        // Race condition: another request created the session a millisecond ago!
        // Fallback to retrieving it.
        session = await Session.findOne({ examId, candidateId }).select('+hmacSecret');
        if (!session) throw error; // Should never happen
        if (session.status !== 'active') {
          throw new AppError(`You cannot start this exam because your session is ${session.status}`, 409);
        }
      } else {
        throw error; // Rethrow other errors
      }
    }
  }

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
    hmacSecret: session.hmacSecret, // Send secret to client for telemetry signing
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
