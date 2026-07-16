// ============================================
// SIEGE — Face Detector (Client-Side Vision)
// ============================================
// Runs inside a Web Worker via TensorFlow.js
// Uses BlazeFace for lightweight face detection
// ============================================

/**
 * Face detection result from a single frame analysis.
 */
export interface FaceDetectionResult {
  facesDetected: number;
  timestamp: number;
  isMissing: boolean;      // true if facesDetected === 0
  isMultiple: boolean;     // true if facesDetected > 1
}

/**
 * Initialize the face detection model.
 * Call this once when the Web Worker starts.
 *
 * @returns Promise that resolves when the model is loaded
 *
 * TODO (Dev 3): Implement with TensorFlow.js + BlazeFace
 * ```
 * import * as blazeface from '@tensorflow-models/blazeface';
 * let model: blazeface.BlazeFaceModel;
 * export async function initFaceDetector() {
 *   model = await blazeface.load();
 * }
 * ```
 */
export async function initFaceDetector(): Promise<void> {
  // TODO: Load BlazeFace model
  console.log('[FaceDetector] Model initialization placeholder');
}

/**
 * Analyze a single video frame for face detection.
 *
 * @param imageData - Raw pixel data from canvas
 * @returns Face detection result with count and flags
 *
 * TODO (Dev 3): Implement frame analysis
 */
export async function detectFaces(
  imageData: ImageData
): Promise<FaceDetectionResult> {
  // TODO: Run model.estimateFaces(imageData)
  return {
    facesDetected: 1,
    timestamp: Date.now(),
    isMissing: false,
    isMultiple: false,
  };
}
