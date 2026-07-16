// ============================================
// SIEGE — Risk Score Calculator
// ============================================
// Deterministic scoring algorithm that translates
// raw telemetry events into a 0-100 risk score.
// ============================================

import { RISK_WEIGHTS } from './weights';

export interface EventCount {
  eventType: string;
  count: number;
}

export interface RiskBreakdown {
  eventType: string;
  count: number;
  contributedRisk: number;
  maxRisk: number;
}

export interface RiskResult {
  totalRisk: number;
  breakdown: RiskBreakdown[];
}

/**
 * Calculate the risk score from a list of event counts.
 *
 * @param events - Array of event types and their occurrence counts
 * @returns Total risk (0-100) with per-event breakdown
 */
export function calculateRisk(events: EventCount[]): RiskResult {
  const breakdown: RiskBreakdown[] = [];
  let totalRisk = 0;

  for (const { eventType, count } of events) {
    const weight = RISK_WEIGHTS[eventType];
    if (!weight) continue;

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

  return {
    totalRisk: Math.min(totalRisk, 100),
    breakdown,
  };
}
