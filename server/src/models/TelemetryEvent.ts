// ============================================
// SIEGE Server — TelemetryEvent Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import type { TelemetryEventType } from '../types/index.js';

export interface ITelemetryEventDocument extends Document {
  sessionId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  timestamp: number;
  eventType: TelemetryEventType;
  metadata: Record<string, unknown>;
  questionIndex?: number;
}

const telemetryEventSchema = new Schema<ITelemetryEventDocument>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        'TAB_SWITCH',
        'COPY_PASTE',
        'FACE_MISSING',
        'MULTIPLE_FACES',
        'KEYSTROKE_ANOMALY',
        'HEARTBEAT',
        'LIVENESS_FAIL',
        'FULLSCREEN_EXIT',
        'API_MANIPULATION',
        'HEARTBEAT_TIMEOUT',
      ],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    questionIndex: {
      type: Number,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// --- Indexes ---

// Timeline queries: get all events for a session, sorted by time
telemetryEventSchema.index({ sessionId: 1, timestamp: 1 });

// Aggregation queries: count events by type per session
telemetryEventSchema.index({ sessionId: 1, eventType: 1 });

// --- JSON Transform ---

telemetryEventSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const TelemetryEvent = mongoose.model<ITelemetryEventDocument>(
  'TelemetryEvent',
  telemetryEventSchema
);
