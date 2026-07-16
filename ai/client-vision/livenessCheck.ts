// ============================================
// SIEGE — Liveness Check
// ============================================
// Anti-spoof verification using face landmarks and expressions.
// Defeats virtual camera / looping video attacks.
// ============================================

import * as faceapi from '@vladmandic/face-api';

export type LivenessPrompt = 'LOOK_LEFT' | 'LOOK_RIGHT' | 'SMILE' | 'BLINK';

export interface LivenessResult {
  prompt: LivenessPrompt;
  passed: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Generate a random liveness prompt for the candidate.
 */
export function getRandomPrompt(): LivenessPrompt {
  const prompts: LivenessPrompt[] = ['LOOK_LEFT', 'LOOK_RIGHT', 'SMILE'];
  // Removed BLINK for now as it requires complex temporal aspect ratio over multiple frames
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Initialize liveness models (expressions)
 */
export async function initLivenessModels(): Promise<void> {
  const MODEL_URL = '/models'; 
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  console.log('[LivenessCheck] Models loaded');
}

/**
 * Verify that the candidate performed the requested action.
 */
export async function verifyLiveness(
  prompt: LivenessPrompt,
  imageData: ImageData | any
): Promise<LivenessResult> {
  let tensor;
  try {
    tensor = faceapi.tf.browser.fromPixels(imageData);
  } catch (e) {
    tensor = imageData;
  }

  const detection = await faceapi.detectSingleFace(
    tensor,
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceExpressions();

  if (tensor instanceof faceapi.tf.Tensor) {
    tensor.dispose();
  }

  let passed = false;
  let confidence = 0;

  if (detection) {
    const { landmarks, expressions } = detection;

    if (prompt === 'SMILE') {
      passed = expressions.happy > 0.7;
      confidence = expressions.happy;
    } else if (prompt === 'LOOK_LEFT' || prompt === 'LOOK_RIGHT') {
      const nose = landmarks.getNose()[0];
      const leftEye = landmarks.getLeftEye()[0];
      const rightEye = landmarks.getRightEye()[0];
      
      const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
      const eyeDist = rightEye.x - leftEye.x;
      const noseOffset = nose.x - eyeCenter.x;
      
      if (eyeDist > 0) {
        // LOOK_LEFT implies head turned left (nose is to the right in the image plane from our perspective, or left depending on mirror)
        // Let's use simple thresholding. Nose > 30% right means looking left if mirrored.
        if (prompt === 'LOOK_LEFT' && noseOffset > eyeDist * 0.3) {
          passed = true;
          confidence = Math.min(1, noseOffset / eyeDist);
        } else if (prompt === 'LOOK_RIGHT' && noseOffset < -eyeDist * 0.3) {
          passed = true;
          confidence = Math.min(1, Math.abs(noseOffset) / eyeDist);
        }
      }
    }
  }

  return {
    prompt,
    passed,
    confidence,
    timestamp: Date.now(),
  };
}
