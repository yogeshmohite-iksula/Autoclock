# Changelog

All notable changes to AutoClock will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

---

## [Unreleased]

### Added
- **Parser v0.2** (FR-03, ADR-02) — frozen public interface in `docs/parser-spec.md`.
  - `parseDuration` rewritten with anchored patterns; new formats supported: `1h30`, `1h 30`, `1:30` (HH:MM duration), `2.25hr`, decimal hours. Ambiguous bare decimals + negatives → `0`.
  - `durationFromSlot(slotStart, slotEnd)` added — derives minutes from a HH:MM range; never silently crosses midnight.
  - `tidy` — adds `qa`, `pr` shorthand; trims trailing `, ; :` while keeping `. ! ?`.
  - `validateEntry` — adds `HH:MM` regex (00–23:00–59), 1000-char description cap, friendly null-entry handling.
  - `validateDay` — adds `duration_mismatch` and `large_gap` (>4h) warnings. Warnings never block Confirm — only `total > 24h` and per-entry errors do (PRD §9).
- 44-test suite in `backend/test/parser.test.js` covering every duration format, all tidy rules, group ordering, every validation branch, and each day-level edge case.

### Changed
- `groupByTicket` uses a `Map` internally to preserve first-seen ordering deterministically.
- `groupByTicket` standardised on `Number.isInteger` for `duration_minutes` (was `Number.isFinite`), matching `validateEntry` (PR #1 review M1).

### Fixed
- **PR #1 review blocker:** `groupByTicket` no longer throws on `null`/`undefined` elements or entries missing `jira_key`; they're silently skipped so EP-12 preview can't crash on a half-saved draft or sparse array. Test covers the mixed-junk case.

### Docs
- `docs/parser-spec.md` updated to document the `validateEntry` null-entry defensive path and `groupByTicket`'s skip-on-junk behaviour (PR #1 review M4).

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
