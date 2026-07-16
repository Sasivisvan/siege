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

const QUEUE_KEY = '__siege_telemetry_queue__';

function getQueue(): TelemetryEvent[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        return [];
      }
    }
  }
  return [];
}

function saveQueue(queue: TelemetryEvent[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Add a telemetry event to the queue.
 * Events are batched and sent periodically.
 */
export function enqueueTelemetry(event: TelemetryEvent) {
  const queue = getQueue();
  queue.push(event);
  saveQueue(queue);
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
  const events = getQueue();

  if (events.length === 0) {
    return null;
  }

  const eventsToSend = [...events];
  const body = { sessionId, events: eventsToSend };
  const bodyStr = JSON.stringify(body);

  // Sign with HMAC-SHA256 (must match server's verification)
  const signature = await signPayload(bodyStr, hmacSecret);

  try {
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

    // Remove the successfully sent events from the queue
    const currentQueue = getQueue();
    currentQueue.splice(0, eventsToSend.length);
    saveQueue(currentQueue);

    return res.data;
  } catch (err) {
    console.error('[Telemetry] Flush failed, events retained in local storage.', err);
    throw err;
  }
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
