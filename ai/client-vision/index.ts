// ============================================
// SIEGE — Client Vision Public API
// ============================================

export { initFaceDetector, detectFaces } from './faceDetector';
export type { FaceDetectionResult } from './faceDetector';

export { getRandomPrompt, verifyLiveness } from './livenessCheck';
export type { LivenessPrompt, LivenessResult } from './livenessCheck';
