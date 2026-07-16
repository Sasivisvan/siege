# SIEGE — AI Module

> **Owner:** Dev 3 (The Watcher)
> **Purpose:** AI models, risk scoring algorithm, and face detection utilities

---

## Responsibilities

- TensorFlow.js face detection (BlazeFace / face-api.js)
- Liveness check (anti-spoof verification)
- Explainable risk scoring engine
- Human-readable risk explanation generator

---

## Folder Structure

```
ai/
├── client-vision/              # Runs in the browser (TensorFlow.js)
│   ├── faceDetector.ts         # BlazeFace / face-api.js wrapper
│   ├── livenessCheck.ts        # Random prompt verification (Look Left, Smile)
│   └── index.ts                # Public API exports
├── risk-engine/                # Runs on both client & server
│   ├── weights.ts              # Configurable event weights & caps
│   ├── scorer.ts               # Risk score calculation
│   ├── explainer.ts            # Human-readable explanation generator
│   └── index.ts                # Public API exports
├── tests/                      # Unit tests for AI logic
│   ├── faceDetector.test.ts
│   ├── scorer.test.ts
│   └── explainer.test.ts
├── package.json
└── README.md
```

---

## How This Module Is Used

This module is a **development workspace** for Dev 3. The code produced here is integrated into the other modules:

| Code | Goes Into | How |
|------|-----------|-----|
| `client-vision/*` | `client/src/hooks/useProctoring.ts` + `client/src/workers/` | Dev 2 imports the face detection utilities |
| `risk-engine/*` | `client/src/lib/` AND `server/src/services/riskEngine.ts` | Both sides use the same scoring logic |

> The risk engine code is **duplicated** in both client and server intentionally. The client calculates a preliminary score for UI display; the server **re-verifies** it independently (never trusting the frontend).

---

## Risk Scoring Algorithm

```typescript
// weights.ts
export const RISK_WEIGHTS = {
  TAB_SWITCH:      { perEvent: 15, cap: 45 },
  COPY_PASTE:      { perEvent: 20, cap: 60 },
  FACE_MISSING:    { perEvent: 30, cap: 60 },   // triggered after 10s absence
  MULTIPLE_FACES:  { perEvent: 50, cap: 100 },  // triggered after 5s
  LIVENESS_FAIL:   { perEvent: 40, cap: 40 },
  API_MANIPULATION:{ perEvent: 100, cap: 100 },  // HMAC failure
};
```

---

## Setup

```bash
cd ai
pnpm install
pnpm test
```
