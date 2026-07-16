// ============================================
// SIEGE — Face Detector (Client-Side Vision)
// ============================================
// Runs inside a Web Worker via TensorFlow.js
// Uses face-api.js for face and landmark detection
// ============================================

import * as faceapi from '@vladmandic/face-api';

/**
 * Face detection result from a single frame analysis.
 */
export interface FaceDetectionResult {
  facesDetected: number;
  timestamp: number;
  isMissing: boolean;      // true if facesDetected === 0
  isMultiple: boolean;     // true if facesDetected > 1
  isHeadAway: boolean;     // true if candidate is looking away
}

/**
 * Initialize the face detection model.
 * Call this once when the Web Worker starts.
 */
export async function initFaceDetector(): Promise<void> {
  // In a real environment, we'd host these models locally and provide the absolute path.
  // For the worker environment, this path needs to point to where the weights are hosted.
  const MODEL_URL = '/models'; 
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  console.log('[FaceDetector] Models loaded');
}

/**
 * Analyze a single video frame for face detection.
 *
 * @param imageData - Raw pixel data from canvas (ImageData or HTMLCanvasElement)
 * @returns Face detection result with count and flags
 */
export async function detectFaces(
  imageData: ImageData | any
): Promise<FaceDetectionResult> {
  let tensor;
  try {
    // Attempt to convert ImageData to tensor (works well in Workers)
    tensor = faceapi.tf.browser.fromPixels(imageData);
  } catch (e) {
    // Fallback if imageData is HTMLImageElement/Canvas
    tensor = imageData; 
  }

  const detections = await faceapi.detectAllFaces(
    tensor, 
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks();
  
  if (tensor instanceof faceapi.tf.Tensor) {
    tensor.dispose();
  }

  const facesDetected = detections.length;
  let isHeadAway = false;

  // Simple head pose check using landmarks
  if (facesDetected === 1) {
    const landmarks = detections[0].landmarks;
    const nose = landmarks.getNose()[0];
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[0];
    
    // Calculate if the nose is too far to one side
    const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
    const eyeDist = rightEye.x - leftEye.x;
    
    // If nose offset > 50% of eye distance, head is turned significantly
    if (eyeDist > 0 && Math.abs(nose.x - eyeCenter.x) > eyeDist * 0.5) {
      isHeadAway = true;
    }
  }

  return {
    facesDetected,
    timestamp: Date.now(),
    isMissing: facesDetected === 0,
    isMultiple: facesDetected > 1,
    isHeadAway
  };
}
