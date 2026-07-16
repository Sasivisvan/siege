// ============================================
// SIEGE Server — Risk Engine
// ============================================
// Server-side risk score recalculation.
// NEVER trusts the frontend's math.
// ============================================

import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { Session } from '../models/Session.js';
import { RISK_WEIGHTS, RISK_THRESHOLDS } from '../types/index.js';
import type { RiskScore, RiskBreakdown } from '../types/index.js';

/**
 * Recalculate the risk score for a session from raw telemetry events.
 *
 * This is the AUTHORITATIVE calculation. Even if an attacker
 * tampers with the frontend risk display, this server-side
 * computation from raw events is what the reviewer sees.
 */
export async function recalculateSessionRisk(
  sessionId: string
): Promise<RiskScore> {
  // Aggregate all events by type using MongoDB pipeline
  const aggregation = await TelemetryEvent.aggregate([
    { $match: { sessionId: { $eq: sessionId } } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
  ]);

  // Build risk breakdown
  const breakdown: RiskBreakdown[] = [];
  let totalRisk = 0;

  for (const { _id: eventType, count } of aggregation) {
    const weight = RISK_WEIGHTS[eventType];
    if (!weight) continue; // Skip unknown event types (e.g., HEARTBEAT)

    const rawContribution = count * weight.perEvent;
    const cappedContribution = Math.min(rawContribution, weight.cap);

    breakdown.push({
      eventType,
      count,
      contributedRisk: cappedContribution,
      maxRisk: weight.cap,
    });

    totalRisk += cappedContribution;
  }

  // Cap total at 100
  totalRisk = Math.min(totalRisk, 100);

  // Generate human-readable explanation
  const explanation = generateExplanation(totalRisk, breakdown);

  // Update the session
  const session = await Session.findById(sessionId);
  if (session) {
    session.riskScore = totalRisk;

    // Auto-flag if critical
    if (totalRisk >= RISK_THRESHOLDS.CRITICAL && session.status === 'active') {
      session.status = 'flagged';
      console.warn(`🚨 Session ${sessionId} auto-flagged: risk ${totalRisk}%`);
    }

    await session.save();
  }

  return {
    sessionId,
    totalRisk,
    breakdown,
    explanation,
    lastUpdated: Date.now(),
  };
}

/**
 * Generate a human-readable risk explanation string.
 *
 * Example output:
 * "85% Risk - Critical. Tab switched 3 times (+45%). Multiple faces detected 2 times (+50%)."
 */
function generateExplanation(
  totalRisk: number,
  breakdown: RiskBreakdown[]
): string {
  // Determine severity level
  let severity: string;
  if (totalRisk >= RISK_THRESHOLDS.CRITICAL) severity = 'Critical';
  else if (totalRisk >= RISK_THRESHOLDS.HIGH) severity = 'High';
  else if (totalRisk >= RISK_THRESHOLDS.MEDIUM) severity = 'Medium';
  else if (totalRisk >= RISK_THRESHOLDS.LOW) severity = 'Low';
  else severity = 'Clean';

  if (breakdown.length === 0) {
    return `${totalRisk}% Risk - ${severity}. No suspicious events detected.`;
  }

  // Build explanation from breakdown (sorted by contribution, highest first)
  const sorted = [...breakdown].sort(
    (a, b) => b.contributedRisk - a.contributedRisk
  );

  const reasons = sorted.map((item) => {
    const label = EVENT_LABELS[item.eventType] || item.eventType;
    return `${label} ${item.count} time(s) (+${item.contributedRisk}%)`;
  });

  return `${totalRisk}% Risk - ${severity}. ${reasons.join('. ')}.`;
}

/**
 * Human-readable labels for event types.
 */
const EVENT_LABELS: Record<string, string> = {
  TAB_SWITCH: 'Tab switched',
  COPY_PASTE: 'Copy-paste detected',
  FACE_MISSING: 'Face missing',
  MULTIPLE_FACES: 'Multiple faces detected',
  KEYSTROKE_ANOMALY: 'Keystroke anomaly flagged',
  LIVENESS_FAIL: 'Liveness check failed',
  FULLSCREEN_EXIT: 'Fullscreen exited',
  API_MANIPULATION: 'API manipulation detected',
  HEARTBEAT_TIMEOUT: 'Heartbeat timeout',
};
