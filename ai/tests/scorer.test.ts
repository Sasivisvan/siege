import { describe, it, expect } from 'vitest';
import { calculateRisk } from '../risk-engine/scorer';

describe('Risk Scorer', () => {
  it('should calculate risk correctly for basic events', () => {
    const result = calculateRisk([
      { eventType: 'TAB_SWITCH', count: 1 },
      { eventType: 'FACE_MISSING', count: 1 }
    ]);
    // TAB_SWITCH (1 * 15) + FACE_MISSING (1 * 30) = 45
    expect(result.totalRisk).toBe(45);
    expect(result.breakdown.length).toBe(2);
  });

  it('should calculate new events (Phone Detected, Head Away) and apply caps', () => {
    const result = calculateRisk([
      { eventType: 'PHONE_DETECTED', count: 2 }, // 2 * 80 = 160 (capped at 100)
      { eventType: 'HEAD_AWAY', count: 3 }       // 3 * 30 = 90 (capped at 60)
    ]);
    
    expect(result.breakdown.find(b => b.eventType === 'PHONE_DETECTED')?.contributedRisk).toBe(100);
    expect(result.breakdown.find(b => b.eventType === 'HEAD_AWAY')?.contributedRisk).toBe(60);
    
    // total is min(100 + 60, 100)
    expect(result.totalRisk).toBe(100);
  });
});
