// ============================================
// SIEGE Server — Session Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import type { SessionStatus } from '../types/index.js';

export interface ISessionDocument extends Document {
  examId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  riskScore: number;
  lastHeartbeat: Date;
  hmacSecret: string;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'locked', 'flagged'],
      default: 'active',
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    hmacSecret: {
      type: String,
      required: true,
      select: false, // Don't return by default (security)
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---

// One session per candidate per exam
sessionSchema.index({ candidateId: 1, examId: 1 }, { unique: true });

// Query active sessions (heartbeat monitor)
sessionSchema.index({ status: 1 });

// Query by exam (analytics)
sessionSchema.index({ examId: 1 });

// --- Pre-save: Generate HMAC secret ---

sessionSchema.pre('save', function (next) {
  if (this.isNew && !this.hmacSecret) {
    this.hmacSecret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// --- JSON Transform ---

sessionSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.hmacSecret; // Never leak HMAC secret in responses
    return ret;
  },
});

export const Session = mongoose.model<ISessionDocument>('Session', sessionSchema);
