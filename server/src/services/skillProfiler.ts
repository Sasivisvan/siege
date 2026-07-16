// ============================================
// SIEGE Server — Skill Profiler Service
// ============================================

import mongoose from 'mongoose';
import { Session } from '../models/Session.js';
import { Submission } from '../models/Submission.js';
import { Exam } from '../models/Exam.js';
import { SkillProfile, ITopicScore } from '../models/SkillProfile.js';

/**
 * Recalculate a student's entire skill profile based on all completed exam sessions.
 */
export async function recalculateSkillProfile(userId: string): Promise<any> {
  // 1. Get all completed/flagged sessions for this candidate
  const sessions = await Session.find({
    candidateId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['completed', 'flagged'] },
  });

  const topicMap = new Map<string, { attempted: number; correct: number; difficulty: 'easy' | 'medium' | 'hard' }>();

  for (const session of sessions) {
    const exam = await Exam.findById(session.examId);
    if (!exam) continue;

    const submissions = await Submission.find({ sessionId: session._id });

    for (const question of exam.questions) {
      const topic = question.topic || 'General';
      const difficulty = question.difficulty || 'medium';
      
      const sub = submissions.find(s => s.questionId.toString() === question._id.toString());
      
      let isCorrect = false;
      if (sub) {
        if (question.type === 'mcq' || question.type === 'aptitude') {
          isCorrect = sub.selectedOption === question.correctOption;
        } else if (question.type === 'coding') {
          // For coding, we check if it scored positive points or has code
          isCorrect = typeof sub.score === 'number' ? sub.score > 0 : !!sub.code;
        }
      }

      const existing = topicMap.get(topic) || { attempted: 0, correct: 0, difficulty };
      existing.attempted += 1;
      if (isCorrect) {
        existing.correct += 1;
      }
      topicMap.set(topic, existing);
    }
  }

  // 2. Format into topicScores list and compute mastery
  const topicScores: ITopicScore[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const [topic, data] of topicMap.entries()) {
    const mastery = Math.round((data.correct / data.attempted) * 100);
    topicScores.push({
      topic,
      questionsAttempted: data.attempted,
      questionsCorrect: data.correct,
      difficulty: data.difficulty,
      mastery,
    });

    if (mastery >= 70) {
      strengths.push(topic);
    } else if (mastery < 50) {
      weaknesses.push(topic);
    }
  }

  // 3. Update or create the profile
  const profile = await SkillProfile.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    {
      userId: new mongoose.Types.ObjectId(userId),
      topicScores,
      overallStrengths: strengths,
      overallWeaknesses: weaknesses,
      lastUpdated: new Date(),
    },
    { new: true, upsert: true }
  );

  return profile;
}
