// ============================================
// SIEGE — Risk Score Weights Configuration
// ============================================
// Configurable weights for the explainable risk engine.
// Used by both client (preliminary) and server (authoritative).
// ============================================

export interface RiskWeight {
  /** Points added per occurrence of this event */
  perEvent: number;
  /** Maximum contribution from this event type */
  cap: number;
}

export const RISK_WEIGHTS: Record<string, RiskWeight> = {
  TAB_SWITCH:        { perEvent: 5, cap: 90 },
  COPY_PASTE:        { perEvent: 20, cap: 80 },
  FACE_MISSING:      { perEvent: 30, cap: 60 },
  MULTIPLE_FACES:    { perEvent: 50, cap: 100 },
  KEYSTROKE_ANOMALY: { perEvent: 10, cap: 30 },
  LIVENESS_FAIL:     { perEvent: 40, cap: 40 },
  FULLSCREEN_EXIT:   { perEvent: 15, cap: 45 },
  API_MANIPULATION:  { perEvent: 100, cap: 100 },
  PHONE_DETECTED:    { perEvent: 80, cap: 100 },
  HEAD_AWAY:         { perEvent: 30, cap: 60 },
  PLAGIARISM_DETECTED:{ perEvent: 100, cap: 100 },
};

