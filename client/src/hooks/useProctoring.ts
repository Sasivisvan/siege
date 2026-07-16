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

  const streamRef = useRef<MediaStream | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setWebcamReady(true);
      } catch (err) {
        console.warn('[Proctoring] Webcam access denied:', err);
        setWebcamReady(false);
      }
    }

    startWebcam();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
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
  };
}
