// ============================================
// SIEGE — Shared Constants
// ============================================

// --- Telemetry Event Types ---
export const EVENT_TYPES = {
  TAB_SWITCH: 'TAB_SWITCH',
  COPY_PASTE: 'COPY_PASTE',
  FACE_MISSING: 'FACE_MISSING',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  KEYSTROKE_ANOMALY: 'KEYSTROKE_ANOMALY',
  HEARTBEAT: 'HEARTBEAT',
  LIVENESS_FAIL: 'LIVENESS_FAIL',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  API_MANIPULATION: 'API_MANIPULATION',
} as const;

// --- Risk Weights ---
// Used by both client (preliminary display) and server (authoritative calculation)
export const RISK_WEIGHTS = {
  TAB_SWITCH:       { perEvent: 15, cap: 45 },
  COPY_PASTE:       { perEvent: 20, cap: 60 },
  FACE_MISSING:     { perEvent: 30, cap: 60 },
  MULTIPLE_FACES:   { perEvent: 50, cap: 100 },
  KEYSTROKE_ANOMALY:{ perEvent: 10, cap: 30 },
  LIVENESS_FAIL:    { perEvent: 40, cap: 40 },
  FULLSCREEN_EXIT:  { perEvent: 15, cap: 45 },
  API_MANIPULATION: { perEvent: 100, cap: 100 },
} as const;

// --- Thresholds ---
export const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
} as const;

// --- Timing ---
export const TELEMETRY_BATCH_INTERVAL_MS = 10_000;  // 10 seconds
export const HEARTBEAT_INTERVAL_MS = 30_000;         // 30 seconds
export const HEARTBEAT_TIMEOUT_MS = 35_000;           // 35 seconds (server-side grace)
export const FACE_MISSING_THRESHOLD_MS = 10_000;      // 10 seconds
export const MULTIPLE_FACES_THRESHOLD_MS = 5_000;     // 5 seconds
export const WEBCAM_CAPTURE_INTERVAL_MS = 3_000;      // 3 seconds

// --- API Routes ---
export const API_ROUTES = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
  },
  EXAMS: {
    BASE: '/api/exams',
    BY_ID: (id: string) => `/api/exams/${id}`,
    START: (id: string) => `/api/exams/${id}/start`,
    SUBMIT: (id: string) => `/api/exams/${id}/submit`,
  },
  TELEMETRY: {
    BATCH: '/api/telemetry',
    HEARTBEAT: '/api/telemetry/heartbeat',
  },
  SUBMISSIONS: {
    BASE: '/api/submissions',
    BY_SESSION: (id: string) => `/api/submissions/${id}`,
  },
  SESSIONS: {
    TIMELINE: (id: string) => `/api/sessions/${id}/timeline`,
    RISK: (id: string) => `/api/sessions/${id}/risk`,
  },
  ANALYTICS: {
    BY_EXAM: (id: string) => `/api/analytics/exam/${id}`,
  },
} as const;
