# Changelog

All notable changes to AutoClock will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

---

## [Unreleased]

### Added — Frontend (feat/frontend-allpages — 14 new pages)
- **14 production pages** ported from `docs/FrontEnd Design/` and wired to the backend's EP-08..EP-22 (mocked where the backend hasn't shipped yet; opportunistic real-backend swap via `VITE_USE_MOCKS=0`):
  - **P03 App Shell** — extracted from TodayPage into `<AppShell>` (TopBar + Sidebar + ConnectionsCard + UserMenu) with role-aware nav (`navConfig.js` → `pm_lead | management | operations | admin` per ERD §8) and a **mobile drawer** (hamburger + backdrop + ESC + body-scroll-lock). TodayPage refactored to consume it.
  - **P04 `/close` Close My Day** — preview + confirm via EP-12; navigates to `/close/result` carrying the EP-13 response in `location.state`.
  - **P05 `/close/result` Sync Result** — per-system outcome (Jira / Sheets / Gmail), unified `<StatusPill>` with tone map, per-system retry (EP-13 idempotency).
  - **P06 `/settings`** — Profile · Reminders · Appearance · Connections · Danger zone with section-scoped `<SaveBar>` (clean / dirty / saving). User-scope `GET/PUT /api/me/settings` (new EP — OQ-AP-04).
  - **P07 `/history` My History** — list + month-calendar views (URL-driven `?view=`), 14-day range via EP-08 extended (OQ-AP-06).
  - **P08 `/team` Team Dashboard** — KPI row + team-selector + range tabs + MemberRow table. EP-14 extended (OQ-AP-07).
  - **P09 `/team/:memberId` Team Member Detail** — 14-day `<BarChart>` (Chart.js, lazy-loaded) + DayRowExpandable + AlertBanner. New EP `GET /api/team/members/:id` (OQ-AP-08).
  - **P10 `/org` Management Dashboard** — KPIs + `<Donut>` (Chart.js) + 8-week `<TrendChart>` + per-team cards with `<Sparkline>` + top-projects table. EP-15 extended with `?range=` (OQ-AP-09).
  - **P11 `/ops/compliance` Compliance Console** — 4 stat cards + `<FilterChips>` + selectable `<PersonRow>`s + `<BulkActionBar>` with confirm/run/sent state machine. EP-16 + EP-17.
  - **P12 `/ops/reminders` Reminder History** — 2-pane (rail of past runs + detail pane with EmailPreviewCard). EP-18.
  - **P13 `/ops/leave` Leave Calendar** — month-grid + list / upcoming / holidays views + `<AddLeaveModal>`. EP-21 with holidays returned alongside (OQ-AP-11).
  - **P14 `/admin/users` Users and Roles** — admin-tabs shell + stat row + filter chips + UserTableRow + InviteUserModal. EP-19.
  - **P15 `/admin/projects` Project Mapping** — ProjectMappingRow + MappingFormModal + live `<TestConnectionButton>` state machine. EP-20 + new POST `/api/admin/projects/test` (OQ-AP-12).
  - **P16 `/admin/integrations`** — Jira / Google / Email / Reader sections, each with its own section-scoped `<SaveBar>` (independent dirty state). EP-22 section-scoped (OQ-AP-13).
- **Shared components** built generic at first-use and reused downstream:
  - `<AppShell>` + `<TopBar>` + `<Sidebar>` + `<Icon>` + `navConfig.js`
  - `<StatusPill tone size>` — replaces 5 near-duplicate pills (OQ-AP-05)
  - `<KpiCard variant={default|stat|metric}>` + `<MetricCard delta>` (P08 → P09 → P10 → P11)
  - `<TeamSelector>` · `<RangeTabs>` · `<HoursBar>` · `<MemberRow>` · `<MemberStatusPill>`
  - `<BarChart>` · `<TrendChart>` · `<Sparkline>` · `<Donut>` (Chart.js wrappers, lazy `chart.js/auto`)
  - `<PersonRow>` (P11/P12/P14) · `<FilterChips>` · `<BulkActionBar>`
  - `<AlertBanner>` (P09/P11) · `<SaveBar>` · `<SegmentedRadio>` · `<ConnRow>` · `<SettingsSection>` (P06/P16)
  - `<AdminTabs>` · `<RoleChip>` · `<ConnectionDotsInline>` · `<InviteUserModal>` · `<UserTableRow>` (P14 → P15/P16)
  - `<TicketGroupCard>` (P04 → P07) · `<DestinationRow>` (P04 → P05) · `<WarningPill>` (P04 → P11)
  - `<JiraGlyph>` · `<SheetsGlyph>` · `<GmailGlyph>` (P04 → P05/P06/P15/P16)
  - `<MonthCalendar>` · `<LeaveLegend>` · `<HolidayChip>` (P13)
  - `<EmailPreviewCard>` · `<RunListRail>` · `<RunDetailPane>` (P12)
  - `<IntegrationCard>` · `<ScopeChip>` · `<TestConnectionButton>` · `<ProjectMappingRow>` · `<MappingFormModal>` (P15/P16)
- **CSS strategy:** every page CSS file is **body-class scoped** (`.page-close-my-day`, `.page-compliance`, `.page-mapping`, etc.) so the unprefixed prototype selectors (`.row`, `.kpi`, `.stat`, `.section`, `.actions`, `.field`, `.cell`, `.dot`) don't collide across pages.
- **API surface:** 7 new namespaces added to `web/src/api/` — `history`, `team`, `ops`, `leave`, `admin`, `settings`, `integrations`. `dashboard.js` extended with `range`. All routed through `client.js`; `request(path, { method, body })` signature kept; mocks default ON via `VITE_USE_MOCKS`.
- **Mock backend** extended with ~30 mock catalogue entries (`__USERS`, `__ADMIN_PROJECTS`, `__ADMIN_SETTINGS`, `__ME_SETTINGS`, `__INTEGRATIONS`, plus builders `__buildHistory`, `__buildOrgDashboard`, `__buildMemberDetail`, `__buildCompliance`, `__buildReminders`, `__buildLeave`, `__buildTeamDashboard`). All shapes documented; backend-swap is a one-flag flip.
- **Routes:** 14 new routes added to `web/src/routes.jsx` under existing `<RequireAuth><RequireOnboarded>` plus a new `<RequireRole>` guard. `admin` is auto-allowed by every gate.
- **Brand assets:** `AutoClock_Logo.svg`, `_Logo_dark.svg`, `_Icon.svg`, `_AppIcon.svg` copied from `docs/FrontEnd Design /assets/` into `web/public/assets/`.

### Tested — Frontend (feat/frontend-allpages)
- **58 Playwright tests passing** across 14 pages × 2 viewports (1440×900 desktop + 390×844 mobile) + bespoke flow tests (P03 drawer, P04 confirm-and-sync, P05 retry, P06 save round-trip, P07 list↔calendar, P08 range-tab URL, P09 day expand, P10 month range, P11 bulk-send, P12 select-run, P13 modal+view-toggle, P14 invite, P15 add-with-test-connection, P16 per-card SaveBar independence).
- Per-page gate asserts: no console errors · no horizontal overflow · no unrelated-region overlap · primary heading + primary action visible · full-page screenshot saved to `test-results/screenshots/`.
- Existing 7 smoke tests still green at the new viewports.

### Repo hygiene
- `docs/frontend-allpages-plan.md` — the approved plan + 17 OQ defaults.
- `docs/frontend-allpages-issues.md` — non-blocking issues + backend follow-ups logged during the build (instead of stopping the page-by-page progress).
- `MOCK_USER.role` bumped to `admin` so all role-gated routes are reachable in dev + Playwright (real users get their actual role from EP-01).

### Fixed — Frontend (PR #2 visual review)
- **Issue 1 — `/sign-in` never displayed.** Mock backend auto-signed-in the demo user on module load, and `RequireAuth` bounced any visit to `/sign-in` straight to `/onboarding`. Mocks now start signed-out (`SESSION_USER = null`; `/api/auth/me` → 401), `/api/auth/login` sets the session, `/api/auth/logout` clears it, and onboarding completion flips `connections.jira` to `connected` via a new `_setMockOnboardingComplete()` helper so the demo walks the full Sign-in → Onboarding → Today flow.
- **Issue 2 — mobile chrome corners overlapped centered content.** `.chrome` decorations now hide at `≤640px` (`chrome.css`). Sign-in + Onboarding shells switch from `position:absolute` centring on fixed `100vh` to flow layout with `min-height:100vh` + `padding:24px 16px` so the card vertically centres on small viewports without the corner overlap. Today page hides the sidebar, collapses `.tdy-body-grid` to a single column, and adds `min-width:0` + `overflow-wrap:anywhere` so the form chain (`.tdy-field`, `.tdy-dd-btn`) no longer overflows 375px. Project / ticket pills stay on one line via `white-space:nowrap` while the slot top-line wraps.
- **Issue 3 — onboarding background didn't match prototype.** Both `/sign-in` and `/onboarding` now render the prototype's photo aurora: `bg-photo` + `bg-photo-overlay` instead of `bg-mesh + bg-stars`. New asset `web/public/assets/bg-soft.png` (3 MB, extracted from the `Onboarding.html` `__bundler/manifest`) drives it.
- **UX polish:** `Close My Day` button + Time-mode toggle are now centered on Today (`.tdy-hero .right` + `.tdy-time-mode { align-self:center }`). The `What did you work on?` textarea grows to `min-height:132px / max-height:220px` with an internal `overflow-y:auto` scrollbar instead of pushing the form taller.

### Tested — Frontend
- Playwright CLI smoke rewritten: 3 pages (`/sign-in`, `/onboarding`, `/today`) × 2 viewports (1280×800 desktop + 375×812 mobile) + a root-redirect test. Helpers click through the real Sign-in → Onboarding → Today flow (no module-state pokes). Each test asserts no console errors, no horizontal overflow (with offender diagnostics), heading + primary action visible, and saves a full-page screenshot to `test-results/screenshots/`. 7 tests, all green.

### Added — Frontend (assets)
- `web/public/assets/bg-soft.png` — prototype aurora background (gitignored caches stripped from the repo at the same time).
- `web/package-lock.json` — deterministic install lockfile.

### Repo hygiene
- `.gitignore`: added `node-compile-cache/`, `playwright-transform-cache-*/`, `docs/FrontEnd Design /*.html`, `docs/FrontEnd Design /*.zip`, `docs/*.docx`. Bundled prototype exports stay locally — the small `.md` docs remain tracked.

### Fixed — Frontend (PR #2 code review)
- **A11y blocker:** `TodayPage` description chips ("+ #bug", "+ #review", "+ #standup") were `<span onClick>` — not in the tab order, not keyboard-activated, not announced as actionable. Switched to `<button type="button">`. `.tdy-chip` CSS picks up `appearance:none` + a pill-shaped `:focus-visible` ring so the visual is identical. WCAG 2.1.1 (Keyboard) + 4.1.2 (Name, Role, Value), required by PRD §11.

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
