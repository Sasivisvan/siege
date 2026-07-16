// ============================================
// SIEGE — Explainable Risk Output
// ============================================
// Generates human-readable risk explanations
// for the recruiter review dashboard.
// ============================================

import { RISK_WEIGHTS } from './weights';
import type { RiskBreakdown } from './scorer';

const SEVERITY_LABELS: Record<string, string> = {
  TAB_SWITCH: 'switched tabs',
  COPY_PASTE: 'pasted content into the editor',
  FACE_MISSING: 'was not visible on camera',
  MULTIPLE_FACES: 'had multiple people detected on camera',
  KEYSTROKE_ANOMALY: 'exhibited abnormal typing patterns',
  LIVENESS_FAIL: 'failed the liveness verification',
  FULLSCREEN_EXIT: 'exited fullscreen mode',
  API_MANIPULATION: 'showed signs of API/payload tampering',
};

/**
 * Generate a severity label for a given risk score.
 */
function getSeverity(totalRisk: number): string {
  if (totalRisk >= 90) return 'Critical';
  if (totalRisk >= 75) return 'High';
  if (totalRisk >= 50) return 'Medium';
  if (totalRisk >= 25) return 'Low';
  return 'Clean';
}

/**
 * Generate a human-readable explanation of the risk score.
 *
 * @param totalRisk - The total risk score (0-100)
 * @param breakdown - Per-event risk breakdown
 * @returns Formatted explanation string
 *
 * @example
 * // Returns: "85% Risk — Critical. Candidate switched tabs 3 times.
 * //          Multiple people detected on camera 2 times."
 */
export function explainRisk(
  totalRisk: number,
  breakdown: RiskBreakdown[]
): string {
  const severity = getSeverity(totalRisk);
  const parts: string[] = [`${totalRisk}% Risk — ${severity}.`];

  for (const item of breakdown) {
    if (item.count === 0) continue;
    const label = SEVERITY_LABELS[item.eventType] || item.eventType;
    parts.push(`Candidate ${label} ${item.count} time${item.count > 1 ? 's' : ''}.`);
  }

  return parts.join(' ');
}
