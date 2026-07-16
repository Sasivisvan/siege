// ============================================
// SIEGE Server — Submission Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmissionDocument extends Document {
  sessionId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  code?: string;
  selectedOption?: number;
  submittedAt: Date;
  score?: number;
  plagiarismScore?: number;
  plagiarismDetails?: Array<{
    otherSubmissionId: string;
    otherCandidateId: string;
    quickScore: number;
    fingerprintScore: number;
    structuralScore: number;
    finalScore: number;
    matchedRegions: Array<{ startLine: number; endLine: number }>;
  }>;
}

const submissionSchema = new Schema<ISubmissionDocument>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    code: {
      type: String,
    },
    selectedOption: {
      type: Number,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
    },
    plagiarismScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    plagiarismDetails: {
      type: Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---

// One submission per question per session
submissionSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

// Plagiarism queries: find all submissions for a question
submissionSchema.index({ questionId: 1 });

// --- JSON Transform ---

submissionSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Submission = mongoose.model<ISubmissionDocument>(
  'Submission',
  submissionSchema
);
