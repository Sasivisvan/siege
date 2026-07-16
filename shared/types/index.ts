// ============================================
// SIEGE — Shared Type Definitions
// ============================================
// These types define the API contract between
// client/ and server/. Copy into both projects.
// ============================================

// --- User & Auth ---

export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// --- Exam ---

export type QuestionType = 'coding' | 'mcq' | 'aptitude';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  options?: string[];          // For MCQ
  testCases?: TestCase[];      // For coding
  points: number;
  timeLimit?: number;          // Per-question time limit (seconds)
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  duration: number;            // Total duration in minutes
  createdBy: string;
  settings: ExamSettings;
  createdAt: string;
}

export interface ExamSettings {
  webcamRequired: boolean;
  fullscreenRequired: boolean;
  copyPasteBlocked: boolean;
  tabSwitchLimit: number;
  randomizeQuestions: boolean;
  showRiskToCandidate: boolean;
}

// --- Session ---

export interface ExamSession {
  id: string;
  examId: string;
  candidateId: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'locked' | 'flagged';
  riskScore: number;
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
  | 'HEARTBEAT_TIMEOUT'
  | 'PHONE_DETECTED'
  | 'HEAD_AWAY';

export interface TelemetryEvent {
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
  events: TelemetryEvent[];
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

export interface Submission {
  id: string;
  sessionId: string;
  questionId: string;
  code?: string;
  selectedOption?: number;
  submittedAt: string;
  score?: number;
  plagiarismScore?: number;
}
