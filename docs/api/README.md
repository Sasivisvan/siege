# SIEGE API Documentation

> **Base URL:** `https://<your-backend-host>/api`

This document defines the API contract between the frontend (`client/`) and backend (`server/`). Both teams should refer to this when building their respective modules.

---

## Authentication

### `POST /api/auth/register`
Register a new user (candidate, recruiter, or admin).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "***REMOVED***",
  "name": "John Doe",
  "role": "candidate"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
}
```

---

### `POST /api/auth/login`
Authenticate a user and receive a JWT.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "***REMOVED***"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
}
```

---

## Exams

### `POST /api/exams` *(Admin/Recruiter only)*
Create a new exam.

### `GET /api/exams/:examId`
Get exam details (questions, settings, duration).

### `POST /api/exams/:examId/start`
Start an exam session for the authenticated candidate. Returns a `sessionId`.

### `POST /api/exams/:examId/submit`
Submit the final exam (all answers + code submissions).

---

## Telemetry

### `POST /api/telemetry`
Receive a batch of telemetry events from the client. **HMAC-signed.**

**Headers:**
```
Authorization: Bearer <jwt_token>
X-HMAC-Signature: <hmac_sha256_signature>
```

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "events": [
    {
      "eventType": "TAB_SWITCH",
      "timestamp": 1689456789000,
      "metadata": { "count": 1 }
    },
    {
      "eventType": "FACE_MISSING",
      "timestamp": 1689456792000,
      "metadata": { "durationMs": 12000 }
    }
  ]
}
```

**Response:** `200 OK`
```json
{ "received": 2, "sessionRisk": 45 }
```

---

### `POST /api/telemetry/heartbeat`
Heartbeat signal to confirm the candidate's session is active.

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "timestamp": 1689456800000
}
```

**Response:** `200 OK`
```json
{ "status": "alive", "examLocked": false }
```

---

## Submissions

### `POST /api/submissions`
Submit code for a specific question (auto-saved periodically).

### `GET /api/submissions/:sessionId` *(Recruiter/Admin only)*
Get all submissions for a session, including plagiarism results.

---

## Review & Analytics

### `GET /api/sessions/:sessionId/timeline` *(Recruiter/Admin only)*
Get the full event timeline for a session (for the reviewer dashboard).

### `GET /api/sessions/:sessionId/risk` *(Recruiter/Admin only)*
Get the explainable risk score breakdown.

### `GET /api/analytics/exam/:examId` *(Admin only)*
Get aggregate analytics for an exam (completion rates, avg risk scores, flagged candidates).

---

> [!NOTE]
> This is a **living document**. Update it as endpoints are added or modified.
> Both `client/` and `server/` teams should treat this as the source of truth for API contracts.
