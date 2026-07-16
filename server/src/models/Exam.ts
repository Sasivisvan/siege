// ============================================
// SIEGE Server — Exam Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';

// --- Subdocument: Test Case ---

const testCaseSchema = new Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- Subdocument: Question ---

const questionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['coding', 'mcq', 'aptitude'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    options: [{ type: String }],          // For MCQ/aptitude
    correctOption: { type: Number },       // Index of correct option
    testCases: [testCaseSchema],           // For coding
    points: { type: Number, required: true, min: 1 },
    timeLimit: { type: Number },           // Per-question time limit (seconds)
  },
  { _id: true }
);

// --- Subdocument: Exam Settings ---

const examSettingsSchema = new Schema(
  {
    webcamRequired: { type: Boolean, default: true },
    fullscreenRequired: { type: Boolean, default: true },
    copyPasteBlocked: { type: Boolean, default: true },
    tabSwitchLimit: { type: Number, default: 3 },
    randomizeQuestions: { type: Boolean, default: false },
    showRiskToCandidate: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- Main Document: Exam ---

export interface IExamDocument extends Document {
  title: string;
  description: string;
  questions: Array<{
    _id: mongoose.Types.ObjectId;
    type: string;
    title: string;
    description: string;
    options?: string[];
    correctOption?: number;
    testCases?: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
    points: number;
    timeLimit?: number;
  }>;
  duration: number;
  createdBy: mongoose.Types.ObjectId;
  settings: {
    webcamRequired: boolean;
    fullscreenRequired: boolean;
    copyPasteBlocked: boolean;
    tabSwitchLimit: number;
    randomizeQuestions: boolean;
    showRiskToCandidate: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const examSchema = new Schema<IExamDocument>(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Exam description is required'],
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (v: unknown[]) => v.length > 0,
        message: 'Exam must have at least one question',
      },
    },
    duration: {
      type: Number,
      required: [true, 'Exam duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settings: {
      type: examSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// --- JSON Transform ---

examSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Exam = mongoose.model<IExamDocument>('Exam', examSchema);
