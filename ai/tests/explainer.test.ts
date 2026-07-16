import { describe, it, expect } from 'vitest';
import { explainRisk } from '../risk-engine/explainer';

describe('Risk Explainer', () => {
  it('should generate explanations for multiple events', () => {
    const explanation = explainRisk(100, [
      { eventType: 'PHONE_DETECTED', count: 1, contributedRisk: 80, maxRisk: 100 },
      { eventType: 'HEAD_AWAY', count: 2, contributedRisk: 60, maxRisk: 60 }
    ]);

    expect(explanation).toContain('100% Risk — Critical');
    expect(explanation).toContain('Candidate used a mobile phone during the exam 1 time.');
    expect(explanation).toContain('Candidate looked away from the screen 2 times.');
  });
});
