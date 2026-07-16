# SIEGE — Shared Types & Constants

> **Owned by:** All developers
> **Purpose:** Single source of truth for TypeScript types and constants

---

## What's Here

| File | Description |
|------|-------------|
| `types/index.ts` | All TypeScript interfaces and types (User, Exam, Telemetry, Risk, Submission) |
| `constants/index.ts` | Event types, risk weights, timing thresholds, API route definitions |

---

## How to Use

Since `client/` and `server/` are **deployed independently**, they cannot import from this folder at runtime. Instead:

1. **Copy the type definitions** into your module's local `types/` folder
2. **Keep them in sync** — when types change here, update both sides
3. **This folder is the source of truth** — propose changes here first, then propagate

### For Dev 1 (Server)
```bash
cp shared/types/index.ts server/src/types/shared.ts
cp shared/constants/index.ts server/src/types/constants.ts
```

### For Dev 2 (Client)
```bash
cp shared/types/index.ts client/src/types/shared.ts
cp shared/constants/index.ts client/src/types/constants.ts
```

---

## Rules

- ⚠️ **Any change to `shared/` requires review from at least 2 developers**
- Changes here affect the API contract — coordinate with the team
- Always update `docs/api/README.md` when API shapes change
