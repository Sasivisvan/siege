// ============================================
// SIEGE Server — Classroom Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';

export interface IClassroomDocument extends Document {
  name: string;
  joinCode: string;
  teacher: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  exams: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const classroomSchema = new Schema<IClassroomDocument>(
  {
    name: {
      type: String,
      required: [true, 'Classroom name is required'],
      trim: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    exams: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// --- JSON Transform ---

classroomSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Classroom = mongoose.model<IClassroomDocument>('Classroom', classroomSchema);
