import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDocument extends Document {
  title: string;
  fileUrl: string;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  classroomId?: Types.ObjectId;
  createdAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom' },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
