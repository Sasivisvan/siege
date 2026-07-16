# Contributing to SIEGE

Thank you for contributing to SIEGE! This document outlines the rules and workflows that keep our team productive and our codebase clean.

---

## 📂 Folder Ownership

Each developer has a **primary folder**. You are free to work in your folder without waiting for reviews, but **changes to `shared/` require review from at least one other dev**.

| Developer | Primary Folder | Scope |
|-----------|---------------|-------|
| Dev 1 | `server/` | Backend API, DB, plagiarism engine |
| Dev 2 | `client/` | Frontend UI, telemetry, Web Workers |
| Dev 3 | `ai/` | AI models, risk engine, face detection |
| All | `shared/` | Shared types and contracts (requires review) |







---

## 🌿 Branch Naming Convention

Always branch off `main`. Use the following format:

```
<type>/<module>/<short-description>
```

### Types
- `feature/` — New feature or enhancement
- `fix/` — Bug fix
- `refactor/` — Code restructuring (no behavior change)
- `docs/` — Documentation only
- `test/` — Adding or updating tests
- `chore/` — Tooling, CI, deps, configs

### Examples
```
feature/server/telemetry-ingestion
fix/client/webcam-permission-flow
refactor/ai/risk-engine-weights
docs/shared/api-contract-update
```

---

## 💬 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Examples
```
feat(server): add telemetry ingestion endpoint
fix(client): resolve webcam permission denied on Safari
refactor(ai): extract risk weights into config
docs(shared): update TelemetryEvent interface
test(server): add plagiarism engine unit tests
chore: update dependencies
```

### Types
| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `docs` | Documentation only changes |
| `test` | Adding or correcting tests |
| `chore` | Changes to build process, deps, or auxiliary tools |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

---

## 🔀 Pull Request Workflow

### Rules
1. **Never push directly to `main`** — always open a PR
2. **One module per PR** — don't mix `client/` and `server/` changes
3. **Link the issue** — reference it in the PR description (`Closes #12`)
4. **Keep PRs small** — aim for < 400 lines changed
5. **Self-review first** — check the diff before requesting review

### Process
1. Create a branch following the naming convention
2. Make your changes and commit with proper messages
3. Push your branch and open a PR
4. Fill out the PR template completely
5. Request review from the relevant team member(s)
6. Address feedback, then squash-merge into `main`

### Who Reviews What?
- Changes to `client/` → Dev 2 reviews (or any available dev)
- Changes to `server/` → Dev 1 reviews (or any available dev)
- Changes to `ai/` → Dev 3 reviews (or any available dev)
- Changes to `shared/` → **At least 2 devs must review**








---

## 🏃 Local Development

### First-time Setup
```bash
# Clone the repo
git clone https://github.com/Sasivisvan/siege.git
cd siege

# Set up environment
cp .env.example .env
# Fill in your local values in .env
```

### Running the Project
```bash
# Start the backend (Dev 1)
cd server
pnpm install
pnpm dev

# Start the frontend (Dev 2)
cd client
pnpm install
pnpm dev

# AI module development (Dev 3)
cd ai
pnpm install
pnpm dev
```

### Before Pushing
```bash
# Make sure you're up to date
git pull origin main

# Run linting (from your module folder)
pnpm lint

# Run tests
pnpm test
```

---

## 🚫 Things to Avoid

- ❌ `git add .` with generic commit messages
- ❌ Committing `.env` files (check `.gitignore`)
- ❌ Large, multi-module PRs
- ❌ Pushing directly to `main`
- ❌ Leaving console.log / debug statements in production code
- ❌ Hardcoding secrets, API keys, or credentials

---

## 🐛 Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when filing issues.

## 💡 Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) when proposing new features.
