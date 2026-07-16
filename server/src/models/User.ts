// ============================================
// SIEGE Server — User Model
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../types/index.js';

export interface IUserDocument extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['candidate', 'recruiter', 'admin'],
      default: 'candidate',
    },
  },
  {
    timestamps: true,
  }
);

// --- Pre-save Hook: Hash Password ---

userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- Instance Method: Compare Password ---

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// --- JSON Transform: Remove password from output ---

userSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUserDocument>('User', userSchema);
