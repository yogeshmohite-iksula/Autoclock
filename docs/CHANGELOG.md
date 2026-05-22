# Changelog

All notable changes to AutoClock will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

---

## [Unreleased]

### Added
- Initial repository scaffold per DevDoc §1.
- Monorepo layout: `backend/`, `web/`, `extension/`, `docs/`, `.claude/`.
- DB schema `backend/schema.sql` with all 13 tables (TB-01..TB-13), including TB-13 `external_writes` idempotent sync ledger.
- API contract stubs for all 23 endpoints (EP-01..EP-23) under `backend/routes/`.
- Service module stubs: `parser.js`, `jira.js`, `sheets.js`, `gmail.js`, `crypto.js`, `sync.js`.
- `.env.example` enumerating every variable from DevDoc §3.
- `.gitignore` covering `.env`, `*.db`, `node_modules/`, build outputs, test results, OS detritus.
- `.gitleaks.toml` with rules for Jira tokens, Google OAuth secrets, refresh tokens, GitHub PATs.
- `CLAUDE.md` (project memory) — under 200 lines, 11 sections, links to docs via `@imports`.
- `README.md` with stack, layout, quick start, team mapping, roadmap.
- Generated docs: `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `MILESTONES.md`, `STATUS.md`, `SECURITY.md`.
- `.claude/` config: settings, slash commands, path-filtered rules, hooks, custom subagents, memory system.
- Playwright **CLI** scaffold (NOT MCP) for E2E tests in `web/tests/`.
- CI workflow `.github/workflows/ci.yml` with lint + test + security scan jobs.

### Setup Decisions Logged
- Self-host on Iksula internal server with PM2 — ADR-03 (NOT Vercel/serverless).
- SQLite (WAL mode) chosen over PostgreSQL for ~60 users — ADR-04.
- Per-user OAuth, never a shared bot — ADR-01.
- Free deterministic parser, no paid AI — ADR-02.
- Idempotent EP-13 via `external_writes` ledger — ADR-09.
- Google Workspace OIDC for sign-in — ADR-10.
- Classic Jira API token for M0 (not scoped) — ADR-11.

### Security
- Token encryption: AES-256-GCM with `TOKEN_ENC_KEY` from env (DevDoc §6.6).
- Pre-tool-use secret scan hook (`check-secrets.sh`).
- Daily audit log to `.claude/audit.jsonl` (gitignored).
- Git pre-push hook blocks pushing source changes without a CHANGELOG bump.
