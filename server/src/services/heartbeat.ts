// ============================================
// SIEGE Server — Heartbeat Monitor
// ============================================
// Background process that locks sessions when
// heartbeats stop (anti-telemetry-blocking defense).
// ============================================

import { Session } from '../models/Session.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { HEARTBEAT_TIMEOUT_MS, HEARTBEAT_CHECK_INTERVAL_MS } from '../types/index.js';

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the heartbeat monitor.
 * Runs every 15 seconds, checking all active sessions.
 * If a session hasn't sent a heartbeat in 35 seconds, it gets locked.
 */
export function startHeartbeatMonitor(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  console.log('💓 Heartbeat monitor started');
  console.log(`   Check interval: ${HEARTBEAT_CHECK_INTERVAL_MS / 1000}s`);
  console.log(`   Timeout threshold: ${HEARTBEAT_TIMEOUT_MS / 1000}s`);

  heartbeatInterval = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

      // Find active sessions with stale heartbeats
      const staleSessions = await Session.find({
        status: 'active',
        lastHeartbeat: { $lt: cutoff },
      });

      for (const session of staleSessions) {
        console.warn(
          `⚠️  Session ${session._id} heartbeat timeout. Locking.`
        );

        // Lock the session
        session.status = 'locked';
        await session.save();

        // Record the timeout event
        await TelemetryEvent.create({
          sessionId: session._id,
          candidateId: session.candidateId,
          examId: session.examId,
          timestamp: Date.now(),
          eventType: 'HEARTBEAT_TIMEOUT',
          metadata: {
            lastHeartbeat: session.lastHeartbeat.toISOString(),
            timeoutMs: HEARTBEAT_TIMEOUT_MS,
          },
        });
      }

      if (staleSessions.length > 0) {
        console.log(`   Locked ${staleSessions.length} stale session(s)`);
      }
    } catch (error) {
      console.error('❌ Heartbeat monitor error:', error);
    }
  }, HEARTBEAT_CHECK_INTERVAL_MS);
}

/**
 * Stop the heartbeat monitor (for testing/shutdown).
 */
export function stopHeartbeatMonitor(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('💓 Heartbeat monitor stopped');
  }
}
