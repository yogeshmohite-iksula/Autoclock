# AutoClock — Frontend All-Pages Build Plan

> **PR:** `feat/frontend-allpages` → `main` (one PR at the end). Yogesh merges.
> **Scope:** the 14 design HTMLs not yet shipped — P03 App Shell + 13 routed pages (P04–P17 in design numbering, P04–P16 in this plan's numbering since P03 has no route).
> **Branched off:** `main @ 661fe9f` (PR #1 parser + PR #2 frontend + PR #3 backend all merged).
> **Source of truth:** `docs/FrontEnd Design /*.html` + `docs/AutoClock_ERD.md`.
> **Extraction notes** (full per-page detail): `/tmp/allpages-extraction-notes.md`.
> **Issues log** (don't-stop-the-build policy): `docs/frontend-allpages-issues.md`.

---

## 1. Branch + Git plan

- One branch: `feat/frontend-allpages` (already created off latest main).
- One commit per page (small, clear: `feat(web/<page>): port P0N <name> with desktop+mobile Playwright`).
- Plus prep commits: theme/asset import, `<AppShell>` extraction, shared component pre-extractions, mocks expansion.
- ONE PR opened when all 14 pages are Playwright-green at both viewports.
- Pre-push hook still requires `docs/CHANGELOG.md` bump — landed in the final commit before opening the PR.

## 2. Routes — final map

| Route                        | Page (file)                                      | Role gate                       | Notes |
|------------------------------|--------------------------------------------------|---------------------------------|-------|
| `/sign-in`                   | `SignInPage.jsx` (shipped)                       | unauthenticated                 | — |
| `/onboarding`                | `OnboardingPage.jsx` (shipped)                   | authed, `!onboarded`            | — |
| `/today`                     | `TodayPage.jsx` (shipped — refactored to use `<AppShell>`) | authed, onboarded   | — |
| **`/close`**                 | `CloseMyDayPage.jsx`                             | employee+                       | EP-12 preview |
| **`/close/result`**          | `SyncResultPage.jsx`                             | employee+                       | rendered from EP-13 response (state, not refetch) |
| **`/settings`**              | `SettingsPage.jsx`                               | any authed                      | user-scope |
| **`/history`**               | `MyHistoryPage.jsx`                              | employee+ (self)                | EP-08 date-range |
| **`/team`**                  | `TeamDashboardPage.jsx`                          | `pm_lead` + admin               | EP-14 |
| **`/team/:memberId`**        | `TeamMemberDetailPage.jsx`                       | `pm_lead` + admin               | EP-14 ext / new EP |
| **`/org`**                   | `ManagementDashboardPage.jsx`                    | `management` + admin            | EP-15 |
| **`/ops/compliance`**        | `ComplianceConsolePage.jsx`                      | `operations` + admin            | EP-16 + EP-17 |
| **`/ops/reminders`**         | `ReminderHistoryPage.jsx`                        | `operations` + admin            | EP-18 |
| **`/ops/leave`**             | `LeaveCalendarPage.jsx`                          | `operations` + admin            | EP-21 |
| **`/admin/users`**           | `UsersRolesPage.jsx`                             | `admin`                         | EP-19 |
| **`/admin/projects`**        | `ProjectMappingPage.jsx`                         | `admin`                         | EP-20 |
| **`/admin/integrations`**    | `IntegrationsPage.jsx`                           | `admin`                         | EP-22 |

Routes added via `web/src/routes.jsx` — wrapped by `<RequireAuth>` + `<RequireOnboarded>` + a new `<RequireRole roles={[...]}/>` guard.

## 3. App Shell — reconciliation with existing TodayPage

**Extract once, refactor TodayPage to consume it.**

```
web/src/components/shell/
  AppShell.jsx          ← <header><Sidebar/><main>{children}</main>
  TopBar.jsx            ← brand · date pill · bell · cog · user menu
  Sidebar.jsx           ← Workspace + role section + footer + connections card
  ConnectionsCard.jsx   ← small Jira/Sheets/Gmail dots in sidebar
  UserMenu.jsx          ← avatar + name + role caret
  Icon.jsx              ← inline SVG icon set (today, history, team, org, comp, console, settings, bell, gear, chevron)
  navConfig.js          ← BASE_NAV + ROLE_EXTRA + FOOT_NAV (from the design)
web/src/styles/
  app-shell.css         ← extracted from today.css (.tdy-topbar/.tdy-sidebar/.tdy-body-grid)
```

**TodayPage refactor:** strips the topbar/sidebar JSX, wraps page-body in `<AppShell>`. CSS classes for shell stay `tdy-*` (already shipped) — we don't rename, we extract; `today.css` keeps only the body-area classes. This is the lowest-risk reconciliation.

**Mobile drawer:** the prototype has only a desktop "« Collapse" button. We add a hamburger toggle that opens a drawer at `≤720px` (matches existing Today mobile breakpoint). Drawer closes on route change. Resolves **OQ-AP-03** (default: hamburger drawer + backdrop).

## 4. Shared components — pre-extractions (build during the earlier pages, reuse later)

| Component                         | First used | Also used by | Lives in |
|-----------------------------------|------------|--------------|----------|
| `<AppShell>` + sub-components     | P03        | every page   | `components/shell/` |
| `<StatusPill tone size>` (one component, replaces 5 near-duplicates) | P05 | P07, P12, P16 | `components/pills/StatusPill.jsx` |
| `<TicketGroupCard>`               | P04        | P07          | `components/today/TicketGroupCard.jsx` |
| `<DestinationRow>`                | P04        | P05          | `components/close/DestinationRow.jsx` |
| `<WarningPill>`                   | P04        | P11          | `components/pills/WarningPill.jsx` |
| `<JiraGlyph>`/`<SheetsGlyph>`/`<GmailGlyph>` | P04 | P05, P06, P15, P16 | `components/glyphs/` |
| `<SaveBar>` + `<SegmentedRadio>` + `<ConnRow>` + `<SettingsSection>` | P06 | P16 | `components/settings/` |
| `<KpiCard>` / `<StatCard>` (one with `variant="stat"`) | P08 | P10, P11 | `components/cards/KpiCard.jsx` |
| `<TeamSelector>` + `<RangeTabs>` + `<HoursBar>` + `<MemberRow>` + `<MemberStatusPill>` | P08 | P09, P10 | `components/team/` |
| `<DailyChart>` + `<TrendChart>` + `<Sparkline>` + `<Donut>` (Chart.js wrappers) | P09 | P10 | `components/charts/` |
| `<AlertBanner>`                   | P09        | P11          | `components/banners/AlertBanner.jsx` |
| `<PersonRow>`                     | P11        | P12, P14     | `components/people/PersonRow.jsx` |
| `<FilterChips>` + `<BulkActionBar>` | P11      | P14, P15     | `components/filters/` |
| `<EmailPreviewCard>`              | P12        | —            | `components/ops/` |
| `<MonthCalendar>` + `<LeaveListRow>` + `<HolidayChip>` + `<LeaveLegend>` | P13 | — | `components/leave/` |
| `<AdminTabs>`                     | P14        | P15, P16     | `components/admin/AdminTabs.jsx` |
| `<RoleChip>` + `<UserTableRow>` + `<InviteUserModal>` + `<ConnectionDotsInline>` | P14 | P16 | `components/admin/` |
| `<TestConnectionButton>` + `<MappingFormModal>` | P15 | — | `components/admin/` |
| `<IntegrationCard>` + `<ScopeChip>` + `<HealthPill>` | P16 | — | `components/admin/` |

## 5. CSS strategy

- **Per-page CSS files**, imported by their page JSX. Files: `app-shell.css`, `close-my-day.css`, `sync-result.css`, `settings.css`, `my-history.css`, `team-dashboard.css`, `team-member.css`, `management.css`, `compliance.css`, `reminders.css`, `leave-calendar.css`, `users-roles.css`, `project-mapping.css`, `integrations.css`.
- **Body-class scoping is mandatory.** Every page's outer wrapper inside `<AppShell>`'s main slot is `<div className="page-<name>">`. Every page-CSS selector is prefixed with that class. This prevents the catastrophic clash of `.row`, `.kpi`, `.stat`, `.section`, `.actions`, `.field`, `.cell` that the design HTMLs share across pages.
- **No Tailwind.** Keep `var(--ac-*)` tokens from `autoclock-theme.css`. Per-data `hue` (project/team colour) goes inline via `style={{ background: hue }}`.
- **No new colours.** Tokens come from `autoclock-theme.css` only.

## 6. API surface — additions to `web/src/api/`

Existing (already wired): `auth`, `connections`, `projects`, `entries`, `day`, `dashboard`. **New / extended:**

```
web/src/api/
  history.js       ← list({from,to})                  → EP-08 (ext)
  team.js          ← team({teamId?,range?})           → EP-14
                     member(id)                       → new EP / EP-14 ext  (OQ-AP-08)
  ops.js           ← compliance({week})               → EP-16
                     runCheck({type, recipientIds?})  → EP-17
                     reminders({filter?})             → EP-18
  leave.js         ← list({month?}); add(payload)     → EP-21
  admin.js         ← users.list / invite / update     → EP-19
                     projects.list / create / test    → EP-20 (+ test sub) (OQ-AP-12)
                     settings.get / update            → EP-22 (global)
  settings.js      ← me.get / me.update               → new EP-22b (user)  (OQ-AP-04)
  integrations.js  ← get(); update(payload)           → EP-22 (filtered)
```

- All routed through `client.js` (cookie credentials, JSON, throws on `!res.ok`).
- All have mock implementations in `web/src/api/mocks.js` behind `VITE_USE_MOCKS=1` (default ON). Mock shapes copied verbatim from the prototypes' `const TEAMS / USERS / RUNS / PEOPLE / PROJECTS / LEAVE / HOLIDAYS / DAYS / GROUPS = […]` literals.
- Each namespace exported from `api/index.js`. Build wires real endpoints opportunistically: any 200 from the backend uses real data; 404/501 falls back to mocks. This lets us test functionality against PR #3 backend now and a real DB swap is one file later.
- Mocks → real swap is one-line: remove `if (USE_MOCKS) return …` guard.

## 7. Open Questions — proposed defaults (so the build doesn't stall)

The 17 OQs from the extraction notes. **I'll proceed with the recommended default for each unless you override** — you can amend in the issues log if you want a change after seeing the build:

| OQ | Topic | **Default I'll use** |
|----|-------|----------------------|
| AP-01 | role-key `pm` vs `pm_lead` | **`pm_lead`** (parity with backend ERD §8). SPA aliases `pm` → `pm_lead` at the API boundary. |
| AP-02 | secondary nav for Operations / Admin | **Top tabs inside the section** (`<AdminTabs>` for Admin; same pattern for Ops). Single sidebar item per role. |
| AP-03 | mobile sidebar UX | **Hamburger in TopBar at `≤720px`; drawer slides over `<main>` with backdrop; closes on route change.** |
| AP-04 | user-scope settings endpoint | **New `GET/PUT /api/me/settings`** (mocked now). Distinct from global EP-22. Flag for Keval. |
| AP-05 | `SyncPill` vs `StatusPill` | **One `<StatusPill tone size>` component**, two sizes (`sm`, `md`). |
| AP-06 | history date-range | **Extend EP-08:** `GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD` (current single-`date` still works). Mocked now. |
| AP-07 | EP-14 shape extension | **Mock the extended shape now** (`range`, `members[].status`, `lastClose`, `weekTarget`). Issue logged for Keval to align. |
| AP-08 | team-member-detail endpoint | **New `GET /api/team/members/:id`.** Mocked now. |
| AP-09 | EP-15 `?range=` param | **Add `?range=week\|month\|quarter`** to EP-15. Mocked now. |
| AP-10 | reminder email templates | **Inline the email body in EP-18 per-run payload** (simpler, no second EP). |
| AP-11 | holidays storage | **EP-21 response also returns `holidays:[]` for the month** (no sister endpoint). |
| AP-12 | project mapping test endpoint | **New `POST /api/admin/projects/test {jiraKey}`** → `{ok, message}`. |
| AP-13 | integration save granularity | **Section-scoped PUT to EP-22**: `PUT /api/admin/settings { section:'jira'\|'google'\|'email'\|'reader', body:{…} }`. |
| AP-14 | role theming everywhere | **Role only affects sidebar visibility + RBAC gates.** No per-role theming inside pages. |
| AP-15 | Audit tab in P14 | **Stub the tab with "Coming soon" copy.** Real `GET /api/admin/audit` is M1 backlog. |
| AP-16 | empty-state copy | **Default to the prototype's copy verbatim**; Yogesh can override per page in the issues log. |
| AP-17 | sidebar connections card | **Pulls from existing `connections.js` shim.** Same source-of-truth as Onboarding. |

## 8. Per-page Playwright gate

`web/tests/allpages.spec.js` (new file, extends the existing `smoke.spec.js`). Helpers:

- `signInAndOnboard(page)` (reuse).
- `gotoAuthed(page, path)` (sign in → mark onboarded → navigate).
- `assertNoOverflow(page)` — scans every element for `scrollWidth > clientWidth` and `boundingBox.right > viewport.width`. Reports offending tag + class + offsets.
- `assertNoOverlap(page, regionSelectors)` — picks header / sidebar (if visible) / main / each top-level card, asserts no two unrelated regions intersect.
- `assertNoConsoleErrors(page)` — collected via `page.on('console')` from page-creation.
- `screenshot(page, name)` → `test-results/screenshots/<page>-<viewport>.png`.

Each new page gets two tests:
```
test('viewport @ desktop (1440×900) › /<route> renders cleanly', ...)
test('viewport @ mobile  (390×844)  › /<route> renders cleanly', ...)
```

A page is **not done** until both are green. Loop fix → retest until green. Then commit.

## 9. Build order (with shared-component extractions inline)

1. **Prep commit 0** — copy brand SVGs from `docs/FrontEnd Design /assets/*.svg` to `web/public/assets/`; add `<RequireRole>` guard; expand `mocks.js` skeletons (empty handlers per new namespace); add `<StatusPill>` unified component.
2. **P03 — App Shell** — extract from TodayPage; refactor TodayPage to consume; add mobile drawer; ship `app-shell.css`. Playwright on `/today` (existing) + a new `/today` mobile drawer test.
3. **P04 — Close My Day** (`/close`) — wires to EP-12. Extracts: `<TicketGroupCard>`, `<DestinationRow>`, `<WarningPill>`, brand glyphs.
4. **P05 — Sync Result** (`/close/result`) — rendered from EP-13 response carried via `location.state` (no refetch). Extracts: unified `<StatusPill>`, `<ResultRow>`, `<NextActionCard>`.
5. **P06 — Settings** (`/settings`) — wires to mocked `api.settings.me`. Extracts: `<SettingsSection>`, `<SaveBar>`, `<SegmentedRadio>`, `<ConnRow>`.
6. **P07 — My History** (`/history`) — wires to EP-08-range (mocked). Reuses `<TicketGroupCard>`. Adds `<HistoryRail>` (list+calendar views).
7. **P08 — Team Dashboard** (`/team`) — wires to EP-14. Extracts: `<KpiCard>`, `<TeamSelector>`, `<RangeTabs>`, `<MemberRow>`, `<HoursBar>`, `<MemberStatusPill>`.
8. **P09 — Team Member Detail** (`/team/:memberId`) — wires to mocked member EP. Extracts: `<DailyChart>` + `<TrendChart>` + `<Sparkline>`, `<MetricCard>`, `<DayRowExpandable>`, `<TicketRow>`, `<AlertBanner>`.
9. **P10 — Management Dashboard** (`/org`) — wires to EP-15 (mocked). Adds `<Donut>`, `<TeamCard>`, `<ProjectRow>`.
10. **P11 — Compliance Console** (`/ops/compliance`) — wires to EP-16 + EP-17. Extracts: `<StatCard>`, `<PersonRow>`, `<BulkActionBar>`, `<FilterChips>`.
11. **P12 — Reminder History** (`/ops/reminders`) — wires to EP-18. Reuses `<PersonRow>`. Adds `<RunListRail>`, `<RunDetailPane>`, `<EmailPreviewCard>`.
12. **P13 — Leave Calendar** (`/ops/leave`) — wires to EP-21 (mocked). Adds `<MonthCalendar>`, `<LeaveListRow>`, `<HolidayChip>`, `<LeaveLegend>`, `<AddLeaveModal>`.
13. **P14 — Users and Roles** (`/admin/users`) — wires to EP-19. Extracts: `<AdminTabs>`, `<RoleChip>`, `<UserTableRow>`, `<InviteUserModal>`, `<ConnectionDotsInline>`. Audit tab stubbed.
14. **P15 — Project Mapping** (`/admin/projects`) — wires to EP-20 + the new test sub-EP (mocked). Adds `<ProjectMappingRow>`, `<MappingFormModal>`, `<TestConnectionButton>`.
15. **P16 — Integrations** (`/admin/integrations`) — wires to EP-22 (sectioned). Adds `<IntegrationCard>`, `<ScopeChip>`, `<HealthPill>`.

Final commits:
- (a) Update `docs/CHANGELOG.md` (`[Unreleased]` section) with the full page list + OQs.
- (b) Open PR.

## 10. Non-stop policy

Per Yogesh's instruction: **don't stop the build for issues.** Any of the following gets a one-line entry in `docs/frontend-allpages-issues.md` and we keep going:

- Backend returns 4xx/5xx that doesn't match the mock shape → log + fall back to mock.
- A design HTML uses an asset that doesn't exist → log + render a styled placeholder.
- A Playwright test exposes a layout fix that has knock-on visual consequences → log + ship the fix.
- An OQ default I picked turns out wrong after Yogesh reviews → log + planned in a follow-up commit.
- ERD field mismatch → log + run on the mock until Keval aligns.

## 11. Definition of done (for the PR)

- All 14 pages have routes and render at both viewports.
- Per-page Playwright tests green at 1440×900 and 390×844.
- No console errors in any test.
- No horizontal overflow at either viewport.
- No element-overlap at either viewport.
- Full-page screenshots saved to `test-results/screenshots/` for Yogesh's manual review.
- `web/tests/smoke.spec.js` (existing 7 tests) still green.
- `npm run build` clean in `web/`.
- `docs/CHANGELOG.md` updated.
- `docs/frontend-allpages-issues.md` reflects every issue found.
- ONE PR opened into `main`. Not merged.

---

## What I need from you before I write any page code

A single thumbs-up on this plan (or amendments). If you want to change any OQ default, name them; otherwise I proceed with the defaults in §7.
