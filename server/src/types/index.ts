// ============================================
// SIEGE Server — TypeScript Type Definitions
// ============================================
// Server-specific types + shared contract types.
// Copied from shared/types/index.ts with additions.
// ============================================

import { Request } from 'express';

// ================================================
// Shared Contract Types (from shared/types/index.ts)
// ================================================

// --- User & Auth ---

export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface IUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}

// --- Exam ---

export type QuestionType = 'coding' | 'mcq' | 'aptitude';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface IQuestion {
  id?: string;
  type: QuestionType;
  title: string;
  description: string;
  options?: string[];
  correctOption?: number;
  testCases?: ITestCase[];
  points: number;
  timeLimit?: number;
}

export interface IExamSettings {
  webcamRequired: boolean;
  fullscreenRequired: boolean;
  copyPasteBlocked: boolean;
  tabSwitchLimit: number;
  randomizeQuestions: boolean;
  showRiskToCandidate: boolean;
}

export interface IExam {
  id: string;
  title: string;
  description: string;
  questions: IQuestion[];
  duration: number;
  createdBy: string;
  settings: IExamSettings;
  createdAt: Date;
}

// --- Session ---

export type SessionStatus = 'active' | 'completed' | 'locked' | 'flagged';

export interface ISession {
  id: string;
  examId: string;
  candidateId: string;
  startedAt: Date;
  endedAt?: Date;
  status: SessionStatus;
  riskScore: number;
  lastHeartbeat: Date;
  hmacSecret: string;
}

// --- Telemetry ---

export type TelemetryEventType =
  | 'TAB_SWITCH'
  | 'COPY_PASTE'
  | 'FACE_MISSING'
  | 'MULTIPLE_FACES'
  | 'KEYSTROKE_ANOMALY'
  | 'HEARTBEAT'
  | 'LIVENESS_FAIL'
  | 'FULLSCREEN_EXIT'
  | 'API_MANIPULATION'
  | 'HEARTBEAT_TIMEOUT';

export interface ITelemetryEvent {
  sessionId: string;
  candidateId: string;
  examId: string;
  timestamp: number;
  eventType: TelemetryEventType;
  metadata: Record<string, unknown>;
  questionIndex?: number;
}

export interface TelemetryBatch {
  sessionId: string;
  events: ITelemetryEvent[];
}

export interface TelemetryResponse {
  received: number;
  sessionRisk: number;
}

// --- Risk ---

export interface RiskBreakdown {
  eventType: TelemetryEventType;
  count: number;
  contributedRisk: number;
  maxRisk: number;
}

export interface RiskScore {
  sessionId: string;
  totalRisk: number;
  breakdown: RiskBreakdown[];
  explanation: string;
  lastUpdated: number;
}

// --- Submission ---

export interface IPlagiarismDetail {
  otherSubmissionId: string;
  otherCandidateId: string;
  quickScore: number;
  fingerprintScore: number;
  structuralScore: number;
  finalScore: number;
  matchedRegions: Array<{ startLine: number; endLine: number }>;
}

export interface ISubmission {
  id: string;
  sessionId: string;
  questionId: string;
  code?: string;
  selectedOption?: number;
  submittedAt: Date;
  score?: number;
  plagiarismScore?: number;
  plagiarismDetails?: IPlagiarismDetail[];
}

// ================================================
// Server-Specific Types
// ================================================

/**
 * JWT payload structure.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Express Request with authenticated user attached.
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// --- Risk Weights ---

export interface RiskWeight {
  perEvent: number;
  cap: number;
}

export const RISK_WEIGHTS: Record<string, RiskWeight> = {
  TAB_SWITCH:        { perEvent: 15, cap: 45 },
  COPY_PASTE:        { perEvent: 20, cap: 60 },
  FACE_MISSING:      { perEvent: 30, cap: 60 },
  MULTIPLE_FACES:    { perEvent: 50, cap: 100 },
  KEYSTROKE_ANOMALY: { perEvent: 10, cap: 30 },
  LIVENESS_FAIL:     { perEvent: 40, cap: 40 },
  FULLSCREEN_EXIT:   { perEvent: 15, cap: 45 },
  API_MANIPULATION:  { perEvent: 100, cap: 100 },
};

export const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
} as const;

// --- Timing Constants ---

export const HEARTBEAT_TIMEOUT_MS = 35_000;  // 35 seconds
export const HEARTBEAT_CHECK_INTERVAL_MS = 15_000; // Check every 15 seconds
