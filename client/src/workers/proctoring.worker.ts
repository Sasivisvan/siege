import * as faceapi from '@vladmandic/face-api';

// Need to explicitly tell face-api it's running in a worker environment
// with no DOM (window/document) access for model loading.
// faceapi.env.monkeyPatch({ Canvas: OffscreenCanvas as any });

let isReady = false;

// Initialize the models
async function init() {
  try {
    // Models will be served from the public/models directory of the Next.js app
    const MODEL_URL = '/models'; 
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    isReady = true;
    self.postMessage({ type: 'READY' });
  } catch (err) {
    console.error('[Worker] Model load error:', err);
  }
}

init();

self.onmessage = async (event: MessageEvent) => {
  if (event.data.type === 'PROCESS_FRAME') {
    if (!isReady) return; // Skip if models not loaded

    const bitmap: ImageBitmap = event.data.bitmap;
    
    try {
      // Use tf.browser.fromPixels directly on ImageBitmap which is heavily optimized
      // and natively supported in Web Workers
      const tensor = faceapi.tf.browser.fromPixels(bitmap);
      
      const detections = await faceapi.detectAllFaces(
        tensor,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();
      
      tensor.dispose();

      const facesDetected = detections.length;
      let isHeadAway = false;

      // Head pose check
      if (facesDetected === 1) {
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose()[0];
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[0];
        
        const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
        const eyeDist = rightEye.x - leftEye.x;
        
        if (eyeDist > 0 && Math.abs(nose.x - eyeCenter.x) > eyeDist * 0.5) {
          isHeadAway = true;
        }
      }

      self.postMessage({
        type: 'RESULT',
        result: {
          facesDetected,
          timestamp: Date.now(),
          isMissing: facesDetected === 0,
          isMultiple: facesDetected > 1,
          isHeadAway
        }
      });

    } catch (err) {
      console.error('[Worker] Face detection error:', err);
    } finally {
      // Very important to close the bitmap to prevent memory leaks in the worker!
      bitmap.close();
    }
  }
};
