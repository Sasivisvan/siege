import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentModel } from '../models/Document.js';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Exam } from '../models/Exam.js';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * @route POST /api/documents/upload
 * @desc Upload a document
 */
router.post('/upload', authenticate, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { examId, classroomId } = req.body;
    
    // Convert paths to use forward slashes even on Windows for consistency
    const fileUrl = `/uploads/${req.file.filename}`;

    const newDoc = new DocumentModel({
      title: req.file.originalname,
      fileUrl,
      mimeType: req.file.mimetype,
      uploadedBy: req.user?.userId,
      classroomId: classroomId || undefined,
    });

    await newDoc.save();

    // If examId is provided, automatically attach this document to the exam
    if (examId) {
      await Exam.findByIdAndUpdate(examId, {
        $push: { attachments: newDoc._id }
      });
    }

    res.status(201).json({
      success: true,
      document: newDoc,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: 'Server error during upload' });
  }
});

/**
 * @route GET /api/documents/:id
 * @desc Get document details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    res.json({ success: true, document: doc });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete a document
 */
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Verify ownership (only uploader can delete)
    if (doc.uploadedBy.toString() !== req.user?.userId) {
      res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
      return;
    }

    // Remove file from disk
    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await doc.deleteOne();

    // Optionally: remove reference from all exams (we can let mongo handle this or do it manually)
    await Exam.updateMany(
      { attachments: doc._id },
      { $pull: { attachments: doc._id } }
    );

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
