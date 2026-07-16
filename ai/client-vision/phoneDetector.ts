// ============================================
// SIEGE — Phone Detector (Client-Side Vision)
// ============================================
// Runs inside a Web Worker via TensorFlow.js
// Uses COCO-SSD for lightweight object detection
// ============================================

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model: cocoSsd.ObjectDetection | null = null;

export interface PhoneDetectionResult {
  phoneDetected: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Initialize the COCO-SSD object detection model.
 */
export async function initPhoneDetector(): Promise<void> {
  // Ensure TF.js backend is ready
  await tf.ready();
  model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  console.log('[PhoneDetector] Model loaded');
}

/**
 * Analyze a single video frame for cell phones.
 *
 * @param imageData - Raw pixel data
 * @returns Detection result
 */
export async function detectPhone(
  imageData: ImageData | any
): Promise<PhoneDetectionResult> {
  if (!model) {
    throw new Error('Model not initialized. Call initPhoneDetector() first.');
  }

  // Predict objects
  const predictions = await model.detect(imageData);
  
  // Look for "cell phone" in predictions
  const phonePrediction = predictions.find(p => p.class === 'cell phone');

  return {
    phoneDetected: !!phonePrediction && phonePrediction.score > 0.5,
    confidence: phonePrediction ? phonePrediction.score : 0,
    timestamp: Date.now(),
  };
}
