// ============================================
// SIEGE Client — Proctoring Hook
// ============================================
// Monitors browser events (tab switch, fullscreen,
// copy-paste, webcam) and feeds telemetry queue.
// ============================================

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { enqueueTelemetry, flushTelemetry, sendHeartbeat } from '@/lib/telemetry';
import { useKeystrokeAnalytics } from '@/hooks/useKeystrokeAnalytics';

const TELEMETRY_FLUSH_INTERVAL = 10_000;  // 10 seconds
const HEARTBEAT_INTERVAL = 30_000;         // 30 seconds

// We can load models once globally so hot-reloads don't crash
let modelsLoaded = false;
let faceapi: any = null;
let cocoSsdModel: any = null;

async function loadModels() {
  if (modelsLoaded) return;
  try {
    faceapi = await import('@vladmandic/face-api');
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const tf = await import('@tensorflow/tfjs');
    
    const MODEL_URL = '/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    
    await tf.ready();
    cocoSsdModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    
    modelsLoaded = true;
    console.log('[Proctoring] AI Models loaded successfully.');
  } catch (err) {
    console.error('[Proctoring] Failed to load AI models:', err);
  }
}

interface ProctoringState {
  webcamReady: boolean;
  riskScore: number;
  isFullscreen: boolean;
  isLocked: boolean;
  tabSwitchCount: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  debugInfo: string;
  logs: string[];
}

interface UseProctoringOptions {
  sessionId: string | null;
  hmacSecret: string | null;
  enabled: boolean;
}

/**
 * Proctoring hook that monitors browser signals and sends telemetry.
 */
export function useProctoring({ sessionId, hmacSecret, enabled }: UseProctoringOptions): ProctoringState {
  const [webcamReady, setWebcamReady] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState('Initializing proctoring...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    console.log(`[Proctoring] ${msg}`);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`].slice(-8));
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Consecutive counts for events to avoid false positives
  const missingCountRef = useRef(0);
  const multipleCountRef = useRef(0);

  // --- Emit Telemetry Event ---
  const emit = useCallback((eventType: string, metadata: Record<string, unknown> = {}) => {
    enqueueTelemetry({
      eventType,
      timestamp: Date.now(),
      metadata,
    });
  }, []);

  // --- Keystroke Analytics Hook ---
  useKeystrokeAnalytics({
    enabled,
    onAnomaly: emit
  });

  // --- Webcam Setup ---
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startWebcam() {
      try {
        addLog('Requesting camera permissions...');
        setDebugInfo('Requesting camera permissions...');
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          });
          addLog('Webcam stream obtained with ideal constraints.');
        } catch (initialErr: any) {
          console.warn('[Proctoring] Ideal camera constraints failed, trying basic video...', initialErr);
          addLog(`Ideal camera failed (${initialErr.message || initialErr}). Trying basic video...`);
          setDebugInfo('Ideal camera failed, trying basic video...');
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          addLog('Webcam stream obtained with basic constraints.');
        }
        
        if (cancelled) {
          addLog('Webcam stream cancelled during setup.');
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          addLog('Assigning stream to video.srcObject...');
          setDebugInfo('Setting video source...');
          videoRef.current.muted = true;
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => {
              addLog('Video element playing successfully.');
              setDebugInfo('Webcam active & playing.');
            })
            .catch(err => {
              console.warn('[Proctoring] Video play failed', err);
              addLog(`Play blocked: ${err.message || err}`);
              setDebugInfo(`Play blocked: ${err.message || err}. Click page to start.`);
            });
        } else {
          addLog('Warning: videoRef.current is NULL.');
          setDebugInfo('Video ref not ready yet.');
        }
        setWebcamReady(true);
      } catch (err: any) {
        console.warn('[Proctoring] Webcam access completely denied:', err);
        addLog(`Webcam error: ${err.message || err}`);
        setDebugInfo(`Webcam error: ${err.message || err}`);
        setWebcamReady(false);
      }
    }

    // Attempt to play video on any user interaction to bypass autoplay restrictions (e.g. Safari Low Power Mode)
    function playOnInteraction() {
      if (videoRef.current && videoRef.current.paused) {
        addLog('User clicked page. Attempting fallback play()...');
        videoRef.current.play()
          .then(() => {
            addLog('Play succeeded via user interaction.');
            setDebugInfo('Webcam active (via interaction)');
            window.removeEventListener('click', playOnInteraction);
            window.removeEventListener('touchstart', playOnInteraction);
          })
          .catch(err => {
            addLog(`Interaction play failed: ${err.message || err}`);
            console.warn('[Proctoring] Interaction play failed', err);
          });
      }
    }
    window.addEventListener('click', playOnInteraction);
    window.addEventListener('touchstart', playOnInteraction);

    addLog(`Hook activated (sessionId: ${sessionId ? 'provided' : 'none'})`);
    startWebcam();
    setDebugInfo('Loading AI models...');
    addLog('Importing AI models...');
    loadModels().then(() => {
      setDebugInfo('AI Models loaded. Monitoring...');
      addLog('AI Models loaded. Starting monitoring loop.');
    });

    // Frame capture loop (runs every 1 second)
    frameIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const canvasWidth = 320;
      const canvasHeight = 240;

      // Self-healing: if video element mounts late (e.g. after fullscreen is entered), assign stream
      if (video && !video.srcObject && streamRef.current) {
        addLog('Self-healing: videoRef is now mounted. Assigning stream...');
        video.muted = true;
        video.srcObject = streamRef.current;
        video.play()
          .then(() => addLog('Self-healing: Video playing successfully.'))
          .catch(err => addLog(`Self-healing: Play failed: ${err.message || err}`));
      }

      if (!video || video.readyState < 2) return;

      // Draw the video frame as a snapshot to the canvas first
      if (canvas) {
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        }
      }

      if (!modelsLoaded || !faceapi) return;

      try {
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();

        if (canvas) {
          const displaySize = { width: canvasWidth, height: canvasHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Overlays drawn on top of the already drawn video frame
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            
            if (cocoSsdModel) {
              const predictions = await cocoSsdModel.detect(video);
              const phones = predictions.filter((p: any) => p.class === 'cell phone');
              if (phones.length > 0) {
                emit('PHONE_DETECTED', { count: phones.length, confidence: phones[0].score });
                
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
                ctx.fillStyle = '#ff0000';
                ctx.font = '16px Arial';
                const scaleX = canvas.width / video.videoWidth;
                const scaleY = canvas.height / video.videoHeight;
                phones.forEach((p: any) => {
                  const [x, y, w, h] = p.bbox;
                  ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);
                  ctx.fillText(`Phone (${Math.round(p.score * 100)}%)`, x * scaleX, (y * scaleY) > 20 ? (y * scaleY) - 5 : 20);
                });
              }
            }
          }
        }

        const facesDetected = detections.length;
        let isHeadAway = false;

        if (facesDetected === 1) {
          const landmarks = detections[0].landmarks;
          const nose = landmarks.getNose()[0];
          const leftEye = landmarks.getLeftEye()[0];
          const rightEye = landmarks.getRightEye()[0];
          
          const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
          const eyeDist = rightEye.x - leftEye.x;
          
          if (eyeDist > 0 && Math.abs(nose.x - eyeCenter.x) > eyeDist * 0.5) {
            isHeadAway = true;
            emit('HEAD_AWAY', { reason: 'eyes_averted' });
          }
        }

        // Handle Missing Face
        if (facesDetected === 0) {
          missingCountRef.current += 1;
          if (missingCountRef.current === 10) {
            emit('FACE_MISSING', { duration: 10 });
          }
        } else {
          missingCountRef.current = 0;
        }

        // Handle Multiple Faces
        if (facesDetected > 1) {
          multipleCountRef.current += 1;
          if (multipleCountRef.current === 5) {
            emit('MULTIPLE_FACES', { count: facesDetected });
          }
        } else {
          multipleCountRef.current = 0;
        }

      } catch (err) {
        console.error('[Proctoring] Face detection error:', err);
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      window.removeEventListener('click', playOnInteraction);
      window.removeEventListener('touchstart', playOnInteraction);
    };
  }, [enabled, sessionId, hmacSecret, emit, addLog]);

  // --- Browser Event Listeners ---
  useEffect(() => {
    if (!enabled) return;

    // Tab visibility change
    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        emit('TAB_SWITCH', { direction: 'away', type: 'visibility' });
      }
    }

    // Window focus lost (Alt+Tab) — only count if document is still visible
    function handleBlur() {
      if (!document.hidden) {
        setTabSwitchCount((c) => c + 1);
        emit('TAB_SWITCH', { direction: 'away', type: 'blur' });
      }
    }

    // Fullscreen change
    function handleFullscreenChange() {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      if (!isFS) {
        emit('FULLSCREEN_EXIT');
      }
    }

    // Copy/paste interception
    function handleCopy(e: ClipboardEvent) {
      e.preventDefault();
      emit('COPY_PASTE', { action: 'copy' });
    }

    // Paste interception
    function handlePaste(e: ClipboardEvent) {
      e.preventDefault();
      emit('COPY_PASTE', { action: 'paste', textLength: e.clipboardData?.getData('text')?.length ?? 0 });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, emit]);

  // --- Telemetry Flush Timer ---
  useEffect(() => {
    if (!enabled || !sessionId || !hmacSecret) return;

    flushTimerRef.current = setInterval(async () => {
      try {
        const result = await flushTelemetry(sessionId, hmacSecret);
        if (result) {
          setRiskScore(result.sessionRisk);
        }
      } catch (err) {
        console.error('[Proctoring] Telemetry flush failed:', err);
      }
    }, TELEMETRY_FLUSH_INTERVAL);

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [enabled, sessionId, hmacSecret]);

  // --- Heartbeat Timer ---
  useEffect(() => {
    if (!enabled || !sessionId) return;

    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const result = await sendHeartbeat(sessionId);
        if (result.examLocked) {
          setIsLocked(true);
        }
      } catch (err) {
        console.error('[Proctoring] Heartbeat failed:', err);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [enabled, sessionId]);

  return {
    webcamReady,
    riskScore,
    isFullscreen,
    isLocked,
    tabSwitchCount,
    videoRef,
    canvasRef,
    debugInfo,
    logs,
  };
}
