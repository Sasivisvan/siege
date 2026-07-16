# SIEGE — Server (Backend)

> **Owner:** Dev 1 (The Vault)
> **Stack:** Express.js + TypeScript + MongoDB
> **Hosted independently** from the frontend

---

## Responsibilities

- REST API for the entire platform
- JWT authentication & authorization
- HMAC signature verification on telemetry payloads
- Telemetry ingestion & storage
- Server-side risk score re-verification
- Code plagiarism detection (AST/token-based)
- Heartbeat monitoring & exam locking
- Exam CRUD, question management, submission handling
- Reviewer/admin analytics endpoints

---

## Folder Structure

```
server/
├── src/
│   ├── config/                 # Database connection, env validation
│   │   ├── db.ts               # MongoDB connection
│   │   └── env.ts              # Environment variable validation
│   ├── middleware/              # Express middleware
│   │   ├── auth.ts             # JWT verification
│   │   ├── hmac.ts             # HMAC signature verification
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   └── errorHandler.ts     # Global error handler
│   ├── models/                 # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Exam.ts
│   │   ├── Question.ts
│   │   ├── Session.ts
│   │   ├── TelemetryEvent.ts
│   │   └── Submission.ts
│   ├── routes/                 # Express route handlers
│   │   ├── auth.routes.ts
│   │   ├── exam.routes.ts
│   │   ├── telemetry.routes.ts
│   │   ├── submission.routes.ts
│   │   └── analytics.routes.ts
│   ├── services/               # Business logic
│   │   ├── riskEngine.ts       # Server-side risk score calculation
│   │   ├── plagiarism.ts       # AST + token-based code similarity
│   │   ├── heartbeat.ts        # Heartbeat monitor & exam lock
│   │   └── examService.ts      # Exam lifecycle management
│   ├── utils/                  # Shared helpers
│   │   ├── hmac.ts             # HMAC utility functions
│   │   └── logger.ts           # Logging utility
│   ├── types/                  # Backend TypeScript types
│   └── index.ts                # App entry point
├── tests/                      # Unit & integration tests
│   ├── services/
│   └── routes/
├── .env                        # Backend env vars (never committed)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup

```bash
cd server
pnpm install
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, HMAC_SECRET, PORT
pnpm dev
```

---

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login (JWT) |
| POST | `/api/exams` | Create exam (admin) |
| GET | `/api/exams/:id` | Get exam details |
| POST | `/api/exams/:id/start` | Start exam session |
| POST | `/api/telemetry` | Ingest telemetry batch (HMAC verified) |
| POST | `/api/telemetry/heartbeat` | Session heartbeat |
| POST | `/api/submissions` | Submit code |
| GET | `/api/sessions/:id/timeline` | Event timeline (reviewer) |
| GET | `/api/sessions/:id/risk` | Risk score breakdown |

> See full API docs at [`docs/api/README.md`](../docs/api/README.md)

---

## Security Checklist

- [ ] All telemetry payloads verified via HMAC before processing
- [ ] Risk scores re-calculated server-side (never trust frontend math)
- [ ] Heartbeat timeout triggers exam lock
- [ ] Rate limiting on all public endpoints
- [ ] JWT expiry and refresh implemented
- [ ] No raw error messages exposed to clients

> ⚠️ **This is a standalone app.** It has no file-system dependency on `client/`. It only receives HTTP requests from the frontend.
