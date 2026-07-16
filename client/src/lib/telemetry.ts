// ============================================
// SIEGE Client — Telemetry Pipeline
// ============================================
// Queues proctoring events and flushes them
// to the server in HMAC-signed batches.
// ============================================

import { signPayload } from '@/lib/hmac';
import { apiFetch } from '@/lib/api';

// --- Event Queue (singleton-safe across Next.js hot reloads) ---

interface TelemetryEvent {
  eventType: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  questionIndex?: number;
}

// Use a globalThis-attached singleton to survive HMR re-instantiation
const QUEUE_KEY = '__siege_telemetry_queue__';

function getQueue(): TelemetryEvent[] {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[QUEUE_KEY]) {
      (globalThis as any)[QUEUE_KEY] = [];
    }
    return (globalThis as any)[QUEUE_KEY];
  }
  return [];
}

/**
 * Add a telemetry event to the queue.
 * Events are batched and sent periodically.
 */
export function enqueueTelemetry(event: TelemetryEvent) {
  getQueue().push(event);
}

/**
 * Flush all queued events to the server with HMAC signing.
 *
 * @param sessionId - Current exam session ID
 * @param hmacSecret - Per-session HMAC secret (received from /exams/:id/start)
 * @returns Server response with received count and risk score
 */
export async function flushTelemetry(
  sessionId: string,
  hmacSecret: string
): Promise<{ received: number; sessionRisk: number } | null> {
  const events = getQueue().splice(0);

  if (events.length === 0) {
    return null;
  }

  const body = { sessionId, events };
  const bodyStr = JSON.stringify(body);

  // Sign with HMAC-SHA256 (must match server's verification)
  const signature = await signPayload(bodyStr, hmacSecret);

  const res = await apiFetch<{
    success: boolean;
    data: { received: number; sessionRisk: number };
  }>('/api/telemetry', {
    method: 'POST',
    body: bodyStr,
    headers: {
      'x-hmac-signature': signature,
    },
  });

  return res.data;
}

/**
 * Send a heartbeat to keep the session alive.
 */
export async function sendHeartbeat(sessionId: string): Promise<{
  status: string;
  examLocked: boolean;
}> {
  const res = await apiFetch<{
    success: boolean;
    data: { status: string; examLocked: boolean };
  }>('/api/telemetry/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });

  return res.data;
}
