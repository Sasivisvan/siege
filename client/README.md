# SIEGE — Client (Frontend)

> **Owner:** Dev 2 (The Gate)
> **Stack:** Next.js (App Router) + TypeScript
> **Hosted independently** from the backend

---

## Responsibilities

- Exam-taking UI (code editor, MCQs, aptitude tests)
- Recruiter / Admin dashboard
- Webcam access & face detection (TensorFlow.js in Web Worker)
- Behavioral telemetry capture (tab switches, copy/paste, keystroke velocity)
- Batched telemetry upload to backend API
- HMAC payload signing
- Browser lockdown (fullscreen enforcement, tab exit detection)

---

## Folder Structure

```
client/
├── public/                     # Static assets (favicon, images)
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Login, registration
│   │   ├── (exam)/             # Exam-taking interface
│   │   ├── (dashboard)/        # Recruiter/admin dashboard
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Design system primitives (Button, Input, Card)
│   │   ├── exam/               # Exam-specific (CodeEditor, Timer, QuestionNav)
│   │   ├── proctoring/         # Webcam feed, alerts, lockdown overlay
│   │   └── dashboard/          # Analytics charts, timeline, review tools
│   ├── hooks/                  # Custom React hooks
│   │   └── useProctoring.ts    # Webcam + face detection hook
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # Axios/fetch wrapper for backend calls
│   │   ├── telemetry.ts        # Telemetry batching & sending
│   │   └── hmac.ts             # HMAC signing utility
│   ├── workers/                # Web Workers
│   │   └── proctoring.worker.ts
│   ├── types/                  # Frontend TypeScript types
│   └── styles/                 # Global CSS
├── .env.local                  # Frontend env vars (NEXT_PUBLIC_API_URL)
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## Setup

```bash
cd client
pnpm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
pnpm dev
```

---

## Key Integration Points

| What | How |
|------|-----|
| Backend API | All calls go through `src/lib/api.ts` → `NEXT_PUBLIC_API_URL` |
| Telemetry | Batched POST to `/api/telemetry` every 10s via `src/lib/telemetry.ts` |
| Face Detection | Runs in Web Worker, results fed into telemetry buffer |
| HMAC Signing | Each telemetry batch is signed via `src/lib/hmac.ts` |

> ⚠️ **This is a standalone app.** It has no file-system dependency on `server/`. All communication happens via REST API over HTTPS.
