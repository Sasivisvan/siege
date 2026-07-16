// ============================================
// SIEGE Server — SkillProfile Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';

export interface ITopicScore {
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  averageTimePerQuestion?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mastery: number; // 0 to 100
}

export interface ISkillProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  topicScores: ITopicScore[];
  overallStrengths: string[];
  overallWeaknesses: string[];
  lastUpdated: Date;
}

const topicScoreSchema = new Schema(
  {
    topic: { type: String, required: true, trim: true },
    questionsAttempted: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    mastery: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const skillProfileSchema = new Schema<ISkillProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    topicScores: {
      type: [topicScoreSchema],
      default: [],
    },
    overallStrengths: {
      type: [String],
      default: [],
    },
    overallWeaknesses: {
      type: [String],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// --- JSON Transform ---
skillProfileSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const SkillProfile = mongoose.model<ISkillProfileDocument>('SkillProfile', skillProfileSchema);
