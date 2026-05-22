# AutoClock — Security Policy

> Sized for an internal Iksula tool with ~60 users. Read with [ERD §10](AutoClock_ERD.md) (threat model) and [DevDoc §6.6](AutoClock_DevDoc.md) (token encryption).

---

## 1. Reporting Vulnerabilities

Internal tool — report any suspected vulnerability privately to **Yogesh Mohite** (project owner) via direct message. Do NOT open a public GitHub issue. We acknowledge within 1 working day.

## 2. Authentication & Authorization

- **Sign-in:** Google Workspace OIDC (ADR-10). No passwords stored, no password reset flow, no brute-force surface.
- **Per-user API tokens:** Jira OAuth 3LO + Google OAuth, stored AES-256-GCM encrypted in `user_connections` (DevDoc §6.6).
- **Sessions:** signed HTTP-only cookies; `SameSite=Lax`; HTTPS only.
- **RBAC:** Server-side enforcement on every endpoint via `requireRole(...)`. The client role claim is never trusted.

## 3. Secrets Management

- All secrets live in `backend/.env` (gitignored). Only `.env.example` (with blank values) is committed.
- `TOKEN_ENC_KEY` (32 bytes, hex) — for AES-256-GCM. Never logged, never exposed in errors.
- `SESSION_SECRET` (random hex ≥ 64 chars).
- All Jira / Google credentials are short-lived (3-day classic token for M0; rotating refresh tokens for M1).
- Pre-commit `gitleaks` config (`.gitleaks.toml` at repo root) blocks accidental commits of Jira tokens, Google OAuth secrets, refresh tokens, GitHub PATs.

## 4. Transport Security

- HTTPS only in pilot and production (internal cert or Let's Encrypt — free).
- HSTS header in production.
- `Content-Security-Policy` restricting scripts to self.
- CORS allowlist set to the web app origin and the extension origin only.

## 5. Data Minimization & Privacy

- AutoClock stores only what the employee explicitly types: durations, descriptions, slot times, dates.
- **No** screenshots, **no** keystroke capture, **no** background activity tracking.
- Self-hosted on Iksula infrastructure — no employee data leaves the network.
- No external AI APIs are called by the M0 product (free deterministic parser only — ADR-02).

## 6. Idempotency & Safe Retries

`POST /api/day/close` (EP-13) is **idempotent** per `(user_id, work_date)` via the `external_writes` ledger (TB-13, ADR-09). A double-click, refresh, or retry never duplicates a worklog, Sheet row, or Gmail draft. This is a correctness property AND a defence against replay attacks.

## 7. Worklog Attribution

A Jira worklog is always attributed to the calling token's owner (ADR-01). AutoClock uses **per-user** authentication so worklogs are correctly attributed. The Atlassian *organisation* admin API key cannot read or write Jira issues/worklogs (ADR-08) — it is only used (optionally) for roster import.

## 8. Logging & Audit

- PM2 stdout/stderr logged to disk; rotated daily.
- TB-12 `audit_log` records admin actions and external writes.
- `.claude/audit.jsonl` records every Claude Code tool call (gitignored).

## 9. Dependency Hygiene

- `npm audit` run in CI on every PR.
- Dependabot (free GitHub Apps) enabled at the M1 rollout.
- Pin minor versions in `package.json`; lockfiles committed.

## 10. CI Security Job

`.github/workflows/ci.yml` runs on every PR:
- `gitleaks` for committed secrets.
- `npm audit --audit-level=high` for dependency vulnerabilities.
- Linting + tests.

## 11. What Is Explicitly Out of Scope

- Public bug bounty (this is an internal tool).
- Compliance certifications (SOC2, ISO 27001) — not in scope for a 60-user internal tool unless leadership later requests.
- Network-level intrusion detection — handled by Iksula IT.

---

*Related: [ERD §10 — Privacy Threat Model](AutoClock_ERD.md); [DevDoc §6.6 — Token encryption](AutoClock_DevDoc.md).*
