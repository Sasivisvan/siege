// ============================================
// SIEGE Client — Proctoring Hook
// ============================================
// Monitors browser events (tab switch, fullscreen,
// copy-paste, webcam) and feeds telemetry queue.
// ============================================

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { enqueueTelemetry, flushTelemetry, sendHeartbeat } from '@/lib/telemetry';

const TELEMETRY_FLUSH_INTERVAL = 10_000;  // 10 seconds
const HEARTBEAT_INTERVAL = 30_000;         // 30 seconds

interface ProctoringState {
  webcamReady: boolean;
  riskScore: number;
  isFullscreen: boolean;
  isLocked: boolean;
  tabSwitchCount: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface UseProctoringOptions {
  sessionId: string | null;
  hmacSecret: string | null;
  enabled: boolean;
}

/**
 * Proctoring hook that monitors browser signals and sends telemetry.
 *
 * Usage:
 * ```
 * const { webcamReady, riskScore, isLocked } = useProctoring({
 *   sessionId, hmacSecret, enabled: true
 * });
 * ```
 */
export function useProctoring({ sessionId, hmacSecret, enabled }: UseProctoringOptions): ProctoringState {
  const [webcamReady, setWebcamReady] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
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

  // --- Webcam Setup ---
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setWebcamReady(true);
      } catch (err) {
        console.warn('[Proctoring] Webcam access denied:', err);
        setWebcamReady(false);
      }
    }

    startWebcam();

    // Setup Web Worker for ML
    workerRef.current = new Worker(new URL('../workers/proctoring.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'RESULT') {
        const res = e.data.result;
        
        if (res.isMissing) {
          missingCountRef.current += 1;
          if (missingCountRef.current === 10) { // 10 seconds missing
            emit('FACE_MISSING', { duration: 10 });
          }
        } else {
          missingCountRef.current = 0;
        }

        if (res.isMultiple) {
          multipleCountRef.current += 1;
          if (multipleCountRef.current === 5) { // 5 seconds multiple faces
            emit('MULTIPLE_FACES', { count: res.facesDetected });
          }
        } else {
          multipleCountRef.current = 0;
        }
      }
    };

    // Frame capture loop
    frameIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (video && video.readyState >= 2 && worker) {
        try {
          const bitmap = await createImageBitmap(video);
          worker.postMessage({ type: 'PROCESS_FRAME', bitmap }, [bitmap]);
        } catch (e) {
          // Ignore bitmap creation errors (e.g., if video gets hidden)
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [enabled]);

  // --- Browser Event Listeners ---
  useEffect(() => {
    if (!enabled) return;

    // Tab visibility change
    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        emit('TAB_SWITCH', { direction: 'away' });
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

    function handlePaste(e: ClipboardEvent) {
      emit('COPY_PASTE', { action: 'paste', textLength: e.clipboardData?.getData('text')?.length ?? 0 });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  };
}
