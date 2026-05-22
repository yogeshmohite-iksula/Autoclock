# Changelog

All notable changes to AutoClock will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

---

## [Unreleased]

### Added — Frontend (feat/frontend)
- **Three new screens** ported from `docs/FrontEnd Design/` prototypes as production React under `web/`:
  - `/sign-in` (P01) — Google OIDC sign-in with G keyboard shortcut, IST clock, real `default/loading/error` state machine (FR-23).
  - `/onboarding` (P02) — 3-step stepper + 2× ConnectionRow (Jira + Google) with `idle/connecting/connected/expired` states; Finish enables only when both providers are connected (EP-02 / EP-04 OAuth redirect flow).
  - `/today` (P05) — full Today shell: TopBar with IST date pill, collapsible Sidebar, Hero greeting + `Close My Day` button, ReminderBanner for >1h untracked, LogSlotForm with searchable Project + Jira-task dropdowns, range↔duration toggle, overlap detection, SlotList + GapRow + CloseDayBar.
- **Canonical theme** `web/src/styles/autoclock-theme.css` — "Tech Professional" (Ink Charcoal `#0F172A` + Signal Red `#DC2626`) with full token set + base components (`.ac-btn` / `.ac-card` / `.ac-banner` / `.ac-table` / `.ac-bar` / `.ac-badge` / `.ac-input`) + dark mode via `data-theme="dark"`.
- **`web/src/api/`** — split per endpoint behind a single `client.js` fetch wrapper. Mocks live in `api/mocks.js` behind `VITE_USE_MOCKS` (default ON). Surface: `api.auth`, `api.connections`, `api.projects`, `api.entries`, `api.day`, `api.dashboard`. Shapes match `docs/Project Docs/AutoClock_ERD.md` §6.
- **`AuthContext`** with `RequireAuth` + `RequireOnboarded` route guards.
- **`web/src/lib/format.js`** — pure helpers (initials, fmtTime, fmtDur, minsBetween, addMinsToClock, parseDurText, greeting, todayIso).
- **`web/src/components/today/Dropdown.jsx`** — searchable project/task dropdown extracted from the prototype.
- **`web/src/hooks/useISTClock.js`** — 1 s IST ticker reused across P01/P02.
- Smoke test suite extended to cover `/sign-in`, `/onboarding`, `/today`, and the legacy routes (`/log`, `/preview`, `/dashboard`).

### Changed — Frontend
- `web/src/api.js` removed; replaced by `web/src/api/` folder. Existing pages refactored to use the namespaced surface (`api.projects.list()`, `api.entries.create()` etc.).
- `web/src/assets/tokens.css` removed; subsumed by the canonical theme.
- Legacy `LogPage`/`PreviewPage`/`DashboardPage` switched to canonical `.ac-*` component classes.

### Docs
- `docs/AutoClock_*` source docs moved into `docs/Project Docs/` (no content changes).
- New: `docs/FrontEnd Design/` — the 4 exported design prototypes.
- New: `docs/frontend-plan.md` — the approved rebuild plan for this PR.

### Known follow-ups (flagged in PR description)
- **OQ-F3:** no ERD endpoint for onboarding connection status — currently mocked via `GET /api/auth/connections`. Backend should either add this EP or extend `GET /api/auth/me` with per-provider booleans.
- `bg-soft.png` absent — auth screens fall back to `bg-mesh` (OQ-F4).
- `autoclock-theme.css` source-of-truth lives in the Cowork workspace; the copy in `web/src/styles/` should be kept in sync.

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
