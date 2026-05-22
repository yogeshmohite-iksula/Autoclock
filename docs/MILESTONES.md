# AutoClock — Milestones

> Source: PRD §15 + ERD §14.1. Priority encodes phase: **P0 = M0**, **P1 = M1**, **P2 = stretch**, **P3 = future**.

---

## Milestone 1 — M0 (HackFest, 18 hours)

**Goal:** Working prototype — employee flow end-to-end + one role dashboard, on one demo user's Jira token.

**P0 features (must demo):** FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-18, FR-19, FR-22.

**Entities (TB-01..TB-13):** all 13 tables created in `schema.sql`. M0 only writes to: `users` (1 seeded), `teams`, `projects`, `jira_tasks` (admin-seeded), `worklog_entries`, `user_connections` (1 demo entry), `eod_reports`, `external_writes`, `settings`, `audit_log`.

**Endpoints (M0 subset):** EP-01, EP-06, EP-07, EP-08, EP-09, EP-10, EP-11, EP-12, EP-13, EP-14.

**Success criteria:**
- Employee log flow works end-to-end on one real user (Yogesh's Jira token).
- "Close My Day" writes a real Jira worklog, a real Sheet row, a real Gmail draft.
- One role dashboard renders with seeded data.
- Backup demo video recorded.
- 60-second pitch + two dry runs done.

---

## Milestone 2 — M1 (Pilot rollout, 2–4 weeks post-HackFest)

**Goal:** Self-hosted production with all ~60 users onboarded.

**P1 features:** FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-23.

**Entities (newly active):** `reminder_runs`, `reminder_recipients`, `leave_days`. `user_connections` populated for all 60 via OAuth onboarding. `jira_tasks` refreshed from live JQL.

**Endpoints (newly active):** EP-02..EP-05 (per-user OAuth), EP-15 (org dashboard), EP-16..EP-18 (Ops), EP-19..EP-22 (Admin).

**Success criteria:**
- Self-hosted on Iksula server with HTTPS, PM2, nightly SQLite backup.
- Per-user Jira + Google OAuth onboarding built and tested with rotating refresh tokens.
- Google OIDC sign-in (FR-23) for all 60.
- Timezone (IST↔UTC) verified against Clockwork.
- Leave calendar wired into the Operations target.
- Extension force-installed via Workspace Admin Console (FR-14).
- First 5–10 users onboarded, then all 60.
- 2-week pilot measurement against GM-01..GM-05.

---

## Stretch (Hour 12 Gate — only if M0 core is solid)

**P2 features:** FR-14 (Chrome extension popup + reminders), FR-21 / EP-23 (worklog read-sync via reader account).

**Success criteria:** Either delivers stronger demo data; if not built, dashboards use seeded data and the extension is M1.

---

## Milestone 3 — M2 (Full roles, 1–2 months post-pilot)

**Goal:** Polished consoles for PM, Management, Operations and Admin.

**Out-of-scope until then:** mobile native app, HrMantra integration (FR-17 source), self-hosted Ollama for description polishing, voice input, calendar pull.

---

## Future — M3 (Wider rollout, only if leadership asks)

**Out-of-scope unless explicitly requested.** At that scale, revisit:
- DB upgrade to PostgreSQL (still free).
- Job scheduling beyond `node-cron` (still free options).
- Wider rollout to ~500 employees.

---

## Risky Assumptions to Validate Early

1. **Technical:** Jira **classic** API tokens generated Friday morning are valid through Saturday afternoon (no early expiry) and the demo user has *Browse Projects* + *Work On Issues* on PIM / ML / CUMI. *Mitigation: Tejas POSTs one test worklog before Hr 0.*
2. **Technical:** Google's "Internal" consent screen for the Iksula Workspace org exempts the Cloud project from `gmail.compose` restricted-scope verification. *Mitigation: Ravi captures a working demo refresh token before Friday (Work Plan P-4).*
3. **Timeline:** 18 hours is enough to ship M0 end-to-end on real Jira + Sheets + Gmail. *Mitigation: phase gates at Hr 9 (real worklog) and Hr 12 (extension decision); backup demo video by Hr 16.*

---

*See @docs/AutoClock_PRD.md §15 and @docs/AutoClock_WorkPlan.md for source detail.*
