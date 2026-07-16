// ============================================
// SIEGE Client — Keystroke Analytics Hook
// ============================================

import { useEffect, useRef } from 'react';

interface KeystrokeEvent {
  key: string;
  type: 'keydown' | 'keyup';
  timestamp: number;
}

interface KeystrokeAnalyticsOptions {
  enabled: boolean;
  onAnomaly: (anomalyType: string, metadata: Record<string, any>) => void;
}

export function useKeystrokeAnalytics({ enabled, onAnomaly }: KeystrokeAnalyticsOptions) {
  const eventsRef = useRef<KeystrokeEvent[]>([]);
  const lastKeyupTimeRef = useRef<number | null>(null);
  const keydownTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const now = Date.now();
      keydownTimesRef.current[e.key] = now;

      // Track flight time (time between last keyup and current keydown)
      if (lastKeyupTimeRef.current !== null) {
        const flightTime = now - lastKeyupTimeRef.current;
        // If flight time is abnormally short (<20ms) for consecutive keys, check for bypasses
        if (flightTime < 20) {
          eventsRef.current.push({ key: e.key, type: 'keydown', timestamp: now });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const now = Date.now();
      lastKeyupTimeRef.current = now;

      const pressTime = keydownTimesRef.current[e.key];
      if (pressTime) {
        const dwellTime = now - pressTime; // Duration key was held

        // Log typing speed metrics
        eventsRef.current.push({ key: e.key, type: 'keyup', timestamp: now });

        // Maintain a rolling window of past 30 key events
        if (eventsRef.current.length > 40) {
          eventsRef.current.shift();
        }

        // Analyze timing pattern anomalies
        analyzeKeystrokeAnomalies();
      }
    };

    const analyzeKeystrokeAnomalies = () => {
      const events = eventsRef.current;
      if (events.length < 15) return;

      // 1. Robotic Typing Speed Check (extremely low variance in key interval times)
      const intervals: number[] = [];
      for (let i = 1; i < events.length; i++) {
        intervals.push(events[i].timestamp - events[i - 1].timestamp);
      }

      const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation less than 15ms over 15 keystrokes is highly indicative of auto-typing bots
      if (stdDev < 15 && mean > 50) {
        onAnomaly('KEYSTROKE_ANOMALY', {
          reason: 'robotic_cadence',
          stdDev: Math.round(stdDev),
          meanInterval: Math.round(mean),
        });
        eventsRef.current = []; // Reset window to avoid flooding events
      }

      // 2. Burst Copy-Paste Input Check (massive input size typed in milliseconds)
      const timeWindow = 1000; // 1 second
      const now = Date.now();
      const keysInLastSecond = events.filter(ev => ev.type === 'keyup' && (now - ev.timestamp) < timeWindow);

      // Normal humans type at max 12-15 characters per second (150-180 WPM)
      if (keysInLastSecond.length > 25) {
        onAnomaly('KEYSTROKE_ANOMALY', {
          reason: 'burst_input_detected',
          keystrokesPerSecond: keysInLastSecond.length,
        });
        eventsRef.current = []; // Reset window
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onAnomaly]);
}
