<img src="AutoClock_Logo.png" width="260" alt="AutoClock logo" />

# AutoClock — Master Brainstorm Document

> **Iksula HackFest 2026** · One-Click Daily Worklog & EOD Reporter
> **Owner:** Yogesh Mohite (Sr. QA) and team
> **Tagline:** *"Log it once. We'll handle Clockwork, your timesheet, and your EOD email."*
> **Version:** v3 — updated for the zero-cost rule, the real 60-user target, and the independent (KIMI) review.

---

## 0. Document Purpose

This is the single source of truth for the AutoClock idea. It merges every earlier note — the original project idea, the registration pack, the feasibility research, the independent review, and all later decisions — into one document, so the team can plan, register, and build from a single file. Companion visual mockup: `AutoClock_Designs.html` (7-screen design mockup).

### 0.1 Hard Rules (non-negotiable)

> **RULE 1 — ZERO COST.** AutoClock must use **only free or already-owned tools.** No paid SaaS, no paid API, no paid hosting, no per-user licence — nothing that adds a rupee of cost. Every component below is free, open-source, or already covered by Iksula's existing subscriptions. If a choice has a paid path and a free path, AutoClock always takes the free path.
>
> **RULE 2 — BUILT FOR THE REAL 60.** This is not a throwaway hackathon toy. After HackFest, the **~60 people who do this logging every day will actually use it.** Build, size, and harden it for that real 60-person user base — not for a one-day demo, and not over-engineered for an imaginary 500.

Everything in this document is shaped by those two rules.

---

## 1. Problem Statement

Every Iksula employee performs the **same data entry three times every single day**:

1. **Personal time tracking** — a Google Sheet / Excel "Time sheet" (Time → Duration → Task Description).
2. **Jira Clockwork worklog** — open each Jira task (PIM-XXXX, ML-XXXX), click the gear → **Clockwork → +**, and fill the "Log Work" dialog (Time Spent, Description, Date). Repeat 5–8 times a day.
3. **EOD status email** — format the same information as an HTML table and email the QA lead / manager.

### Pain Points

- 10–15 minutes lost per person per day on duplicate data entry.
- Forgetting to log hours → reconstructing the day from memory at week-end.
- Inconsistent Clockwork compliance across teams.
- Inaccurate project costing and utilization data for leadership.
- QA leads chase team members for missing logs; the Operations team chases everyone every Friday/Monday.

### Validated Scale

> We have identified **~60 people who do this exact logging activity every day.** That is the **real, committed user base** — they will use AutoClock after the hackathon. The whole project is sized for them.
> **Real ROI:** 60 people × 12 min/day × 220 days ≈ **~2,600–3,400 hours/year saved.**
> Company-wide is a *possible later step* (~500 people ≈ ~22,000 hrs/year) — but it is not the build target and the project assumes nothing about it.

---

## 2. The Solution — AutoClock

**AutoClock** is the single source of truth for an employee's working day. The employee logs work **once** — picking the project and exact Jira task — and AutoClock fans the data out to all three downstream systems automatically. It runs entirely on free and already-owned tools.

```
        ┌──────────────────────────────────────────┐
        │  AutoClock — log once, in plain English   │
        │  (Chrome extension  OR  web app)          │
        └────────────────────┬─────────────────────┘
                             │  AutoClock cleans & structures (free parser)
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 ┌──────────────┐    ┌──────────────┐     ┌──────────────┐
 │ Jira         │    │ Google Sheet │     │ Gmail Draft  │
 │ Worklogs     │    │ Timesheet    │     │ EOD Report   │
 │ (Clockwork   │    │ (append row) │     │ (HTML table) │
 │  displays)   │    │              │     │              │
 └──────────────┘    └──────────────┘     └──────────────┘
```

Two ways to log, **both feeding one backend:**
- **Chrome extension** — the primary daily tool. A gentle reminder, then a 20-second entry. Does the *complete* entry (project, Jira task, description, duration, EOD close) without ever opening the web app.
- **Web app** — the same logging on a bigger screen, plus all the dashboards.

---

## 3. The Five User Roles

AutoClock is a role-based system. Each role sees a different, purpose-built view.

| # | Role | What they do | Their screen |
|---|---|---|---|
| 1 | **Employee** | Logs work through the day; one-click EOD sync to Jira + Sheet + Gmail | Extension popup + web log screen |
| 2 | **PM / QA Lead** | Tracks **only their own team / project** — delivery & effort | Team dashboard (delivery metrics) |
| 3 | **Management** | Sees **all ~60 people, all teams** — utilization & trends | Branch dashboard (strategic metrics) |
| 4 | **Operations** | Chases the weekly 40-hour fill (Fri/Mon reminders) | Compliance console + email-history page |
| 5 | **Admin** | Sets up users, roles, project↔Jira mapping, integrations | Admin console |

**Key principle — roles see different things AND different metrics**, because their jobs are different. A PM needs ticket-level effort; management needs utilization trends; ops needs a compliance chase list; admin needs configuration. One backend, five lenses.

---

## 4. Feature Set

### 4.1 Employee logging — Project + Jira Task dropdowns

Each entry captures:

1. **Project** — dropdown (SiteOne PIMCore, Modern Electronics Lego, CUMI Pimcore, Internal/Meetings, Bench).
2. **Jira Task** — a *dependent* dropdown that shows only the tickets on the chosen project (choose SiteOne PIMCore → see PIM-3073, PIM-3162, PIM-2753…). The employee picks the exact task.
3. **Description** — what they did.
4. **Duration** — auto-suggested from the slot, editable.

**Why this matters:** the worklog **always** lands on the correct Jira ticket because the *employee* picks it — never an AI guess. This removes the single biggest accuracy risk and also means AutoClock needs no expensive AI to choose tickets.

### 4.2 Reminder → micro-log → EOD one-click

- At a configurable interval, AutoClock gives a gentle nudge to log the recent slot (see §4.6 for the reminder cadence decision).
- The employee logs the slot in ~20 seconds — no end-of-day memory reconstruction.
- At EOD they click **"Close My Day"**: AutoClock groups entries by ticket, sums durations, tidies descriptions → **preview → confirm** → writes Jira worklogs + appends the Google Sheet + drafts the Gmail EOD email.

### 4.3 Chrome extension as a complete entry tool

The extension is a **full logging tool.** The popup has two tabs:
- **＋ Add Entry** — project dropdown → Jira task dropdown → description → duration → Save.
- **Today** — review/edit the day's entries + the **"Close My Day & Sync All"** button.
- A ⚙ gear sets the reminder cadence.

An employee who lives in the browser **never has to open the web app** to log their whole day. The web app becomes mainly the dashboards.

### 4.4 The Parsing Layer — Zero Paid Services

AutoClock does **not depend on any paid AI API.** Because the employee already picks the project and Jira task explicitly, the only work left is small and deterministic:

- **Duration parsing** — convert "30m", "1h", "1.5h", "90 min" → minutes. Pure, free regex. Reliable and instant.
- **Description tidy-up** — capitalize, trim, expand common shorthand ("scrum" → "Daily Scrum"). A short free rules table.
- **EOD email assembly** — fill a free HTML template with the grouped entries.
- **Grouping & sums** — group entries by ticket and total the durations. Plain code.

This is **free, fast, offline-capable, and cannot run up a bill.** It also means no employee data is sent to any external AI service — a privacy win.

**Optional intelligence (still free):** if Iksula later wants nicer auto-phrasing, a **self-hosted open model** (e.g., Ollama running Llama / Phi / Qwen on an existing Iksula server) can polish descriptions at **zero ongoing cost** and with **no data leaving the Iksula network.** This is optional and not required for the product to work.

*Hackathon note:* if HackFest provides a free AI sandbox during the event, the team may use it for the demo — but the shipped product for the 60 users uses the free parser above, so there is never a cost.

### 4.5 Timezone & Leave Handling *(added after the independent review)*

- **Timezone:** all Iksula staff work in **IST**. Jira Cloud stores worklog timestamps in **UTC**. AutoClock must convert IST → UTC on write and UTC → IST on read, so a worklog logged at 6 PM IST does not land on the wrong day in Clockwork. The Google Sheet stays in IST. This conversion is a fixed, tested rule in the backend.
- **Leave / holidays:** the Operations 40-hour weekly target must **adjust for public holidays, sick leave, and PTO.** Chasing someone who is on approved leave for "missing hours" destroys trust. For the pilot, the Operations admin can mark leave days manually per person; later this can read from HrMantra. The weekly target becomes `40h − (leave days × 8h)`.

### 4.6 Reminder cadence — the decision

The independent review flagged **notification fatigue** as a real risk of aggressive hourly pings. The decision:

- **Do not default to aggressive hourly reminders.** Default to a **gentle cadence** — a few nudges a day (e.g., after lunch, mid-afternoon, and an end-of-day catch-up), not one every 60 minutes.
- The interval stays **user-configurable** (the ⚙ gear) — anyone who wants tighter or looser can change it, including a **pure end-of-day-only mode.**
- Snooze is **one click.**
- The point is captured-while-fresh accuracy *without* becoming an annoyance the team learns to dismiss.

---

## 5. Role-by-Role Detail

### 5.1 Role 1 — Employee
- **Surfaces:** Chrome extension popup (primary) + web log screen.
- **Flow:** reminder fires → pick project + Jira task → type one line → Save → repeat → "Close My Day" syncs everything (after a preview/confirm step).
- **Web log screen** also shows a vertical **day timeline** (logged slots green, current slot highlighted) and the EOD preview table.

### 5.2 Role 2 — PM / QA Lead Dashboard *(delivery focus)*
- **Scope:** strictly their **own team / project only.** A lead cannot see other teams.
- **Metrics:** KPIs (team logged today, avg hours/person, tickets in progress, team compliance %); **effort by Jira ticket**; **"not logged today"** alert list with one-click nudge; team table; exportable team report.

### 5.3 Role 3 — Management Dashboard *(strategic focus)*
- **Scope:** **all ~60 people, every team** — full visibility.
- **Metrics (deliberately different — no per-ticket detail):** workforce logged today, org utilization %, org compliance %, hours/week, active projects; project portfolio; team-vs-team comparison; multi-week utilization trend; department rollup table.

### 5.4 Role 4 — Operations Console *(compliance chase)*
The ops person's real job: chase the weekly 40-hour fill. The screen is built around that workflow.

- **Weekly chase stepper:** Mon–Thu employees log → **Fri 1 PM** remind everyone under target → **Mon 1 PM** re-check, drop the compliant, re-chase the rest → escalate to lead if still short.
- **KPIs:** employees tracked, met target, short (need reminder), reminders sent this week.
- **Week compliance tracker** — every employee, weekly hours, target progress bar (leave-adjusted, see §4.5), status, per-row "Remind" button.
- **Reminder queue** — exactly who gets the Friday reminder and who gets the Monday follow-up.
- **Action buttons:** "Run Friday Check Now", "Run Monday Re-check", "Edit reminder template".
- **Extra page — Reminder History & Email Log:** a full audit trail of every reminder sent + a "Weekly Report" export.
- In production the Friday/Monday sends run on a free `node-cron` schedule (`0 13 * * 5`, `0 13 * * 1`); the buttons let ops trigger or preview them any time.

### 5.5 Role 5 — Admin Console *(system setup)*
- **User Management** — add/remove users, assign roles, map to teams.
- **Projects ↔ Jira Mapping** — define each project and its Jira key; this powers the employee's task dropdown.
- **Integrations** — connection health for Jira, Google Workspace, and the parsing service (all free).
- **Global Settings** — default reminder cadence, weekly hours target, default meeting ticket, auto-draft EOD toggle, Friday/Monday auto-reminder toggle, leave calendar.

---

## 6. The Two Surfaces — Extension vs Web App

| | Chrome Extension | Web App |
|---|---|---|
| **Primary use** | Daily logging + reminders | Dashboards (PM, Mgmt, Ops, Admin) |
| **Strength** | `chrome.alarms` fires reminders reliably even after the browser is closed/reopened | Big screen, rich tables & charts |
| **Logging** | Full entry (project, task, description, duration, EOD) | Full entry + day timeline |
| **Deployment** | Loaded **unpacked** for the hackathon demo; force-installed for the 60 users via the **Google Workspace Admin Console** (free — part of Iksula's existing Workspace; no public Chrome Web Store listing, so no developer fee) | Self-hosted on an existing Iksula server (free) |

Both are thin clients of **one backend** — anything logged in the extension instantly appears in the web dashboards, because they share one database. They never talk to each other directly.

---

## 7. Architecture

```
┌────────────────────────┐     ┌────────────────────────┐
│   CHROME EXTENSION      │     │   WEB APP (React)      │
│   • reminders           │     │   • employee log       │
│   • full entry popup    │     │   • PM dashboard       │
│   • Close My Day        │     │   • Management dash    │
│                         │     │   • Operations console │
│                         │     │   • Admin console      │
└───────────┬─────────────┘     └───────────┬────────────┘
            │     HTTPS / REST JSON         │
            └───────────────┬───────────────┘
                            ▼
        ┌────────────────────────────────────────┐
        │   AUTOCLOCK BACKEND (self-hosted, free) │
        │   Node/Express  (or Python/FastAPI)     │
        │   • Auth + RBAC (5 roles)               │
        │   • Per-user Jira + Google tokens       │
        │   • Free parser → clean & structure     │
        │   • Jira API   → POST worklogs (per user)│
        │   • Gmail API  → draft EOD email         │
        │   • Sheets API → append timesheet        │
        │   • node-cron  → Fri/Mon reminders       │
        │   • SQLite (WAL mode) — fine for 60      │
        └────────────────────────────────────────┘
```

**Stack — all free / open-source:** Node + Express *or* Python + FastAPI · SQLite (WAL mode) · React + Vite · vanilla-JS Manifest V3 extension · free deterministic parser · Jira REST v3 · Gmail API · Google Sheets API v4. Hosted on an existing Iksula internal server.

### 7.1 Jira Access Model — Three Credential Roles *(updated after the admin discussion)*

AutoClock talks to **Jira only.** It never connects to Clockwork — Clockwork (Free / Lite / Pro) does **not** store worklogs separately; it simply *displays* native Jira worklogs. AutoClock writes and reads worklogs through the Jira REST API, and Clockwork reflects them automatically. *(Clockwork's own API is a paid Pro feature — skipped entirely, which keeps the zero-cost rule.)*

A Jira worklog is **always attributed to the account whose token made the call** — the `author` field is ignored. So AutoClock uses **three distinct credential roles**:

**1. Each employee's own credential — to WRITE their worklogs.**
Each of the ~60 employees connects their own Jira account once (a personal API token for the hackathon → OAuth for the pilot). AutoClock writes that person's worklogs with *their* token, so every worklog is correctly attributed. The same applies to Google (each user connects their own account for the Sheet + Gmail draft). The hackathon demo runs as one user (Yogesh) with his own token.

**2. One broad "Browse Projects" account — to READ all worklogs for the dashboards.**
The Operations and Management dashboards must show every employee's hours, including history. AutoClock pulls this from Jira using **one account that can browse all the projects** — the **Operations team member's account** is the natural fit (he already sees every employee in the Clockwork Timesheet). It reads worklogs in bulk via `GET /rest/api/3/worklog/updated` + `POST /rest/api/3/worklog/list`. This rebuilds the Clockwork Timesheet grid inside AutoClock and lets the dashboards show real data from any start date (e.g. 1 March 2026) — complete, because it captures hours logged the old way too, not only via AutoClock.

**3. The org admin API key — optional, and NOT for Jira.**
An Atlassian **Organisation** API key works only with the Atlassian *admin* API (users, groups, org settings). It **cannot** read Jira issues or worklogs. Its only use in AutoClock is letting the Admin console auto-import the employee roster — it is not required.

**Permissions needed: just two** — *Browse Projects* (read) and *Work On Issues* (write / log work), on PIM / ML / CUMI.

> **Token expiry:** Iksula's org caps API tokens at ~3 days. That is fine for the hackathon (create the token on Friday so it covers 22–24 May). For the 60-user pilot, per-user personal tokens would keep expiring — so the pilot uses **OAuth 2.0 (3LO)**, whose rotating refresh tokens auto-renew (the backend must always store the *new* refresh token returned by each refresh).
>
> **Token type & `cloudId` (corrected):** request a **classic** API token for the hackathon — it calls the site URL `https://{site}.atlassian.net/rest/api/3/...` directly, no `cloudId` needed. A **scoped** API token (and OAuth) instead call `https://api.atlassian.com/ex/jira/{cloudId}/...` and **do** need the `cloudId`. *(An earlier draft wrongly said cloudId is "OAuth-only" — scoped tokens need it too.)*

### 7.2 Cost = Zero (by design)

| Component | Choice | Cost |
|---|---|---|
| Backend hosting | Existing Iksula internal server | ₹0 (already owned) |
| Database | SQLite (WAL mode) → PostgreSQL later if ever needed | ₹0 (open-source) |
| Web app framework | React + Vite | ₹0 (open-source) |
| Chrome extension | Manifest V3, loaded unpacked / force-installed via Workspace Admin | ₹0 (no Web Store listing needed) |
| Parsing layer | Free deterministic parser (optional free self-hosted model) | ₹0 |
| Jira API | Included in Iksula's existing Jira subscription | ₹0 incremental |
| Clockwork | Stays on Clockwork **Lite/Free** — never requires Clockwork **Pro** | ₹0 |
| Gmail + Sheets API | Included in Iksula's existing Google Workspace | ₹0 incremental |
| Scheduled jobs | `node-cron` | ₹0 (open-source) |
| Reminders | `chrome.alarms` + `chrome.notifications` | ₹0 (browser APIs) |

**Nothing in AutoClock costs money.** This is a firm constraint, not an aspiration.

---

## 8. Technical Feasibility — Confirmed by Research

| Capability | Method | Status |
|---|---|---|
| Add worklog to a Jira issue | `POST /rest/api/3/issue/{key}/worklog` — attributed to the **calling user's** token | ✅ Confirmed (see §7.1) |
| Show worklogs in Clockwork | Clockwork (Free/Lite/Pro) reads native Jira worklogs automatically — no separate write | ✅ Confirmed |
| Read all employees' worklogs (for the dashboards) | `GET /rest/api/3/worklog/updated` + `POST /rest/api/3/worklog/list`, via one Browse-Projects account | ✅ Confirmed (see §7.1) |
| Append a timesheet row | Google Sheets API v4 `spreadsheets.values.append` | ✅ Free, single call |
| Draft the EOD email | Gmail API `users.drafts.create` (in the user's own account) | ✅ Free, single call |
| Parse / structure entries | Free deterministic parser (regex + rules) — no paid AI | ✅ Confirmed |
| Extension ↔ dashboard sync | Both are clients of one shared backend (NOT `chrome.storage`, which is sandboxed) | ✅ Standard pattern |
| Reminders | `chrome.alarms` + `chrome.notifications` — survive browser close/reopen | ✅ Confirmed |
| Weekly Fri/Mon emails | `node-cron` + Gmail | ✅ Free |
| Role-based dashboards | Standard RBAC — a `role` field + middleware checks | ✅ Confirmed |

### Clockwork — no access needed
"Clockwork Free" was renamed **Clockwork Lite** in January 2025 (older instances may still show "Free"). **AutoClock needs nothing from Clockwork at all** — Clockwork only *displays* native Jira worklogs, so AutoClock reads and writes via the Jira API and Clockwork reflects it. Clockwork's own API is a paid Pro feature; AutoClock never touches it, and never requires Clockwork Pro.

### Jira authentication note
Basic auth with a personal **API token** still works on Jira Cloud and is fine for the hackathon. Some older tokens expire between **March–May 2026**, so **generate a fresh token right before HackFest.** For the 60-user product, per-user OAuth (see §7.1) is the path.

### Chrome extension — key rules
- **Manifest V3** is mandatory; the background service worker sleeps when idle → keep state in `chrome.storage`, register `chrome.alarms` listeners at the **top level** of the service worker, never `setInterval`.
- **No remotely-hosted code** — all JS ships inside the package.
- **Web Store review** takes days to weeks — **not needed.** Load *unpacked* for the demo; force-install via Workspace Admin for the 60 users (free).

### Chatbot — decision: cut it
A chatbot needs a host (Slack/Teams). Iksula's stack is Google Workspace + Jira — no obvious chatbot home. The free-text input box already delivers the "just tell it in plain English" experience. **No standalone chatbot.**

---

## 9. The 18-Hour Build Plan

Team of 5: **B**ackend · **F**rontend · **P**arser/Logic · **Q**A SME (Yogesh) · **D**esigner/Presenter.
HackFest window: Fri 22 May 8 PM → Sat 23 May afternoon.

| Hours | Task | Owner |
|---|---|---|
| 0–1 | Repo setup · fresh Jira API token (demo user) · **freeze the JSON API contract** | B + all |
| 1–4 | Backend: DB schema (SQLite WAL), auth + `role` field, `/parse` `/sync` `/dashboard` endpoints | B |
| 1–5 | Web app shell: employee log screen with **project + Jira task dropdowns** + preview | F |
| 2–6 | Free parser: duration regex, description tidy rules, group-by-ticket | P + Q |
| 5–8 | Wire parser into `/parse`; **preview + confirm** screen | B + F |
| 8–11 | `/sync`: write Jira worklogs + create Gmail draft + append Sheet (with IST→UTC conversion) | B |
| 9–12 | **One** dashboard component, scoped by role (serves PM + Management) | F |
| 12–15 | Chrome extension (if on track): alarm + notification + full-entry popup → backend | B + F |
| 12–15 | Operations "Run Weekly Check" button + Admin seeded users table (if extension cut) | (alt) |
| 15–16 | End-to-end test on the real demo laptop; fix the top 3 bugs | All |
| 16–17 | Record backup demo video on Yogesh's real data | Q |
| 17–18 | Pitch deck + dry run × 2 | D + all |

**Decision gate at hour 12:** core solid? → build the extension. Core shaky? → skip the extension, harden the core.

### 9.1 Suggested Team Roles

| Role | Responsibility |
|---|---|
| **QA SME — Yogesh Mohite** | Workflow design, edge-case definition, live demo, presentation |
| **Frontend Developer** | React UI, project/task dropdowns, dashboards, preview table |
| **Backend Developer** | API integrations (Jira, Sheets, Gmail), auth, RBAC, timezone logic |
| **Parser / Logic Developer** | Free deterministic parser, duration rules, description tidy-up |
| **Designer / Presenter** | Pitch deck, demo flow, branding |

---

## 10. What to Build in 18h vs What to Mock

| Component | Decision |
|---|---|
| Backend + DB + RBAC (5 roles) | 🟢 BUILD |
| Employee log with project + Jira task dropdowns | 🟢 BUILD |
| Free parser → **preview → confirm** | 🟢 BUILD |
| One-click Sync → Jira + Gmail + Sheet | 🟢 BUILD |
| ONE dashboard, scoped by role (PM + Management) | 🟢 BUILD (sample data) |
| Chrome extension — full-entry popup + reminder | 🟡 BUILD IF core done by hour 12 |
| Operations "Run Weekly Check Now" button | 🟡 BUILD IF time |
| Admin console (seeded users table) | 🟡 MINIMAL build / mock |
| Management dashboard as a separate UI | 🔴 MOCK — it's the PM dashboard at wider scope |
| Operations Friday/Monday cron schedule | 🔴 MOCK — explain in pitch |
| Per-user OAuth onboarding | 🔴 MOCK — demo runs on one user's token; OAuth is a pilot task |
| Standalone chatbot | 🔴 CUT |
| Voice input, calendar pull, mobile PWA | 🔴 MOCK — roadmap slide |

> **The rule:** a hackathon is won by one flow working flawlessly + a believable vision — not five half-built dashboards. Scope ruthlessly.

---

## 11. Development Risk Areas & Solutions

| # | Risk | Solution |
|---|---|---|
| 1 | Worklog attributed to a bot, not the employee | **Per-user auth** (§7.1) — each user's own token writes their worklogs. Demo uses Yogesh's own token. |
| 2 | Jira auth setup eats hours | Use a **fresh personal API token** for the demo; build OAuth onboarding only in the pilot phase |
| 3 | Can't publish the extension in time | Load it **unpacked** in Developer Mode — no review, no fee |
| 4 | MV3 service worker sleeps & loses state | Persist to `chrome.storage`; register `chrome.alarms` listeners at top level; never `setInterval` |
| 5 | Wrong Jira ticket on a worklog | Solved by design — employee picks project → task explicitly; **preview confirms** before any write |
| 6 | Jira API rate-limits mid-demo | Retry with exponential backoff + jitter; pre-warm the token; pre-record a backup demo video |
| 7 | Scope creep (5 roles + extension) | Follow §10 ruthlessly — one flow flawless beats five flows broken |
| 8 | Duration parsing edge cases (1.5h, 90m, overlaps) | Deterministic regex normalises to minutes; validate total ≤ 24h; flag overlaps in the preview |
| 9 | Timezone — worklog lands on wrong day | Fixed IST↔UTC conversion in the backend (§4.5); test against Clockwork |
| 10 | Team blocks each other in the sprint | Freeze the API contract (JSON shape) in hour 0–1; work in parallel against mocks |
| 11 | Demo laptop / venue Wi-Fi fails | Deploy early; test on the actual laptop by hour 14; keep the backup video |
| 12 | Google Sheet has formulas / merged cells | Get the **real sheet** before HackFest; test `values.append` against a copy of it |
| 13 | API tokens / secrets leak | Keep tokens in environment variables, never in the repo; `.gitignore` the secrets file |

---

## 12. Plan for the Real 60 Users

The build target is the ~60 people who log time every day. The plan is sized for them — no over-engineering.

| Phase | Timeline | Scope | Users |
|---|---|---|---|
| **0 — HackFest** | 18 hours | Working prototype: employee flow + one role dashboard, on one user's token | Demo |
| **1 — Pilot rollout** | 2–4 weeks after | Self-host on an Iksula server · per-user Jira + Google OAuth onboarding · harden · extension force-installed via Workspace Admin · timezone + leave handling | The **~60** real users |
| **2 — Full roles** | 1–2 months | Proper PM / Management / Operations / Admin consoles · Friday/Monday cron · weekly reports | The same ~60 |
| **3 — Optional, only if leadership asks** | Later | Wider rollout; at that point revisit DB (PostgreSQL — still free) and job scheduling | — |

**Sizing for 60 users (all free):**
- **SQLite with WAL mode** comfortably handles ~60 users — no database licence, no Postgres needed yet.
- **`node-cron`** is enough for the Friday/Monday reminders at this size — no Redis, no job-queue infrastructure needed.
- The backend runs on **one existing Iksula server** — no new hardware.
- These choices stay free *and* keep the system simple to run for a small internal team.

### 12.1 Success Metrics for the Pilot

Targets to measure during a 2-week pilot with the ~60 users:
- 📉 **≥ 80%** reduction in average daily worklog time (from ~12 min to ~2 min).
- 📈 **≥ 95%** Clockwork compliance across pilot teams.
- 📨 **100%** EOD email draft-creation rate for pilot users.
- ⭐ Positive **employee-satisfaction** score from a post-pilot survey — the tool must *feel* like it saves time, not adds it (target: full day logged in under 2 minutes).
- 🎯 Improved **project-costing accuracy** from cleaner, more complete worklog data.

---

## 13. Why AutoClock Wins HackFest 2026

| Judging criterion | Strength |
|---|---|
| Track fit (Automation & Internal Tools) | ⭐⭐⭐⭐⭐ Perfect |
| Solves a real, daily pain | ⭐⭐⭐⭐⭐ ~60 people do this every day |
| Zero cost to run | ⭐⭐⭐⭐⭐ Nothing paid — runs on tools Iksula already owns |
| Demoable in 60 seconds | ⭐⭐⭐⭐⭐ Live "magic moment" |
| Realistic 18-hour build | ⭐⭐⭐⭐ Free, standard APIs only |
| Real adoption committed | ⭐⭐⭐⭐⭐ 60 people will use it after the hackathon |

### 13.1 Competitive Positioning — honest version

| Tool | What it does | Why AutoClock is still the right choice for Iksula |
|---|---|---|
| Tempo Timesheets | Deep Jira time tracking | Paid per user; no Google Sheet sync; no EOD email |
| Clockify | Free Jira timer | Manual timer; no Clockwork; no Sheet; no EOD email |
| **Clockwork Pro** | Timesheet reminders, auto timers, reports — **paid above 10 users** | **Costs money at 60 users (breaks Rule 1);** does **not** write to an external Google Sheet or draft a Gmail EOD email; not shaped to Iksula's exact roles |
| Rize / Flowace / Carly AI | Automatic / AI background tracking | Surveillance-style; privacy concerns; paid; not Iksula-shaped |
| **AutoClock** | One input → Jira worklogs + Google Sheet + Gmail EOD, 5 roles | **Zero cost,** self-hosted (data stays in Iksula), and the only option covering Iksula's exact trio + roles |

**Honest wedge:** Clockwork Pro already does timesheet reminders and reports — but it is **paid** above 10 users and does **not** touch the Google Sheet or the EOD email. AutoClock's real, defensible edge is: **(1) genuinely zero cost, (2) the Google Sheet + Gmail EOD legs that no Jira tool does, (3) one plain-English input, and (4) it is shaped exactly to Iksula's five roles and workflow.** We should say this plainly in the pitch rather than overclaiming.

### 13.2 The 60-Second Demo Script

1. Open three tabs side-by-side: an empty Clockwork pane on a Jira ticket, the May-2026 Google Sheet, an empty Gmail compose window.
2. In AutoClock, log a full day (or paste it). Example day:

   ```
   11:00–11:30  30m  SiteOne Scrum                  → INTERNAL-1
   12:30–13:30  1h   Test cases for PIM-3162        → PIM-3162
   14:30–16:30  2h   Test cases for PIM-3073        → PIM-3073
   16:30–17:30  1h   Testing PIM-3073               → PIM-3073
   17:30–18:00  30m  SiteOne PIM Daily Scrum        → INTERNAL-1
   18:00–19:00  1h   Testing ML-1045                → ML-1045
   19:00–20:00  1h   Backlog Grooming Meeting       → INTERNAL-2
   ```

3. Click **Close My Day** → review the **preview** → **Confirm**.
4. Switch tabs live on screen:
   - Clockwork → new worklogs appear on PIM-3073 / PIM-3162 / ML-1045 ✅
   - Google Sheet → today's rows appended in the exact existing format ✅
   - Gmail → EOD draft with the HTML table, ready to send ✅
5. Closing line: *"12 minutes a day, saved — at zero cost. One click."*

---

## 14. Registration Pitch (Paste-Ready)

### 14.1 Ultra-short (≤300 characters)

> **AutoClock**: Log your day once — pick project &amp; Jira task — and AutoClock posts your Jira worklogs, appends your Google Sheet timesheet, and drafts your EOD email in one click. Saves ~12 min/person/day. Runs on tools Iksula already owns — zero cost.

### 14.2 Short (≤600 characters)

> **AutoClock — One-Click Daily Worklog & EOD Reporter.** Every Iksulaite re-enters the same time data three times daily: a Google Sheet timesheet, Jira Clockwork per ticket, and an EOD email. AutoClock lets the employee log once — picking project and Jira task — via a Chrome extension, then with one click posts the Jira worklogs (Clockwork displays them), appends the Google Sheet, and drafts the EOD email. Role-based views serve PMs, management and Operations. Saves ~12 minutes per person per day for the ~60 people who do this daily. Built entirely on free tools Iksula already owns — zero added cost — and demo-ready in 18 hours.

### 14.3 Long (≤1500 characters)

> **Project:** AutoClock — One-Click Daily Worklog & EOD Reporter.
>
> **Problem:** Around 60 Iksula employees spend 10–15 minutes every day on duplicate data entry — a personal Google Sheet timesheet, re-entering each item into Jira Clockwork (open ticket → gear → + → "Log Work" × 5–8 times), then an HTML EOD email to their lead. That is weak Clockwork compliance and inaccurate project-costing data, every day.
>
> **Solution:** A Chrome extension + web app. The extension nudges the employee to log a 20-second entry, picking the project and exact Jira task. A free deterministic parser tidies the entry; at end of day, after a preview and confirm, one click posts the Jira worklogs, appends the Google Sheet, and drafts the EOD email. Five role-based views — Employee, PM/Lead, Management, Operations and Admin — turn the data into team delivery metrics, utilization, and an automated weekly 40-hour compliance chase.
>
> **Why it wins:** it solves a real daily pain for ~60 committed users, it is demoable in 60 seconds, it is realistic in an 18-hour build, and it runs at **zero cost** — entirely on free tools and APIs Iksula already pays for (Jira, Google Workspace), self-hosted so no data leaves Iksula. Unlike Tempo or Clockwork Pro, it adds no per-user licence and it is the only option covering Iksula's exact trio: Jira worklogs + Google Sheet + EOD email.

---

## 15. Future Roadmap (Post-HackFest, all free)

- 🎤 Voice input — speak your slot.
- 📅 Auto-pull Google Calendar events as logged time.
- 🔮 "Reconstruct Yesterday" — AutoClock rebuilds a forgotten day from Jira activity.
- 📱 Mobile PWA.
- 🔗 HrMantra integration for leave/attendance reconciliation.
- 📊 Leadership analytics & project-costing reports.
- 🤖 Optional free self-hosted model (Ollama) for nicer description phrasing.

---

## 16. Appendix

### Companion files
- `AutoClock_Designs.html` — 7-screen design mockup (Data Flow, Employee Log, Chrome Extension, PM/Lead, Management, Operations, Admin).
- `brainstorm.pdf` — this document as a shareable PDF.
- Logo set: `AutoClock_Logo.svg`/`.png`, `AutoClock_Logo_dark.svg`/`.png`, `AutoClock_Icon.svg`/`.png`, `AutoClock_AppIcon.svg`/`.png`, `AutoClock_Brand.svg`/`.png`.
- `AutoClock_Independent_Review.md` — the independent (KIMI) review (see §17).

### Project ↔ Jira mapping (current understanding)
| Project | Jira key | Example tickets |
|---|---|---|
| SiteOne PIMCore | PIM | PIM-3073, PIM-3162, PIM-2753 |
| Modern Electronics Lego | ML | ML-1045, ML-1044, ML-70 |
| CUMI Pimcore Implementation | CUMI | CUMI-410, CUMI-388 |
| Internal / Meetings | INTERNAL | INTERNAL-1 (scrums), INTERNAL-2 (grooming) |
| Bench | BENCH | BENCH-1 |

### Naming
- **Project code name:** AutoClock
- **Alternate names considered:** ClockGenie · LogPilot · DayWrap · TimeWeaver · EODBuddy · IksuLog

### Research sources
- Clockwork Pro vs Lite — https://docs.herocoders.com/clockwork/clockwork-pro-vs-clockwork-lite
- Clockwork Free became Lite (Jan 2025) — https://docs.herocoders.com/clockwork/introducing-clockwork-lite-a-new-chapter
- Jira Cloud REST API v3 (worklogs) — https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/
- Jira worklog is recorded against the token owner — https://community.developer.atlassian.com/t/adding-jira-worklogs-via-api-for/76862
- Log work via REST API for a given user (JRACLOUD-30197) — https://jira.atlassian.com/browse/JRACLOUD-30197
- Basic auth for REST APIs (API tokens) — https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
- chrome.alarms API — https://developer.chrome.com/docs/extensions/reference/api/alarms
- Manifest V3 overview — https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- Google Sheets API (values.append) — https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- node-cron scheduling — https://blog.logrocket.com/task-scheduling-or-cron-jobs-in-node-using-node-cron/

---

## 17. Independent Review Response (KIMI)

We commissioned an independent, research-backed review of AutoClock (file: `AutoClock_Independent_Review.md`), then **verified its main technical claims with our own internet research** before acting. This section logs the outcome.

### 17.1 Facts we verified (and acted on)

| Claim | Verified? | What we did |
|---|---|---|
| Jira worklogs are attributed to the **token owner**; you cannot log "as another user" via the standard API | ✅ Confirmed | Adopted **per-user authentication** — see §7.1. This is the most important change. |
| "Clockwork Free" became **Clockwork Lite** (Jan 2025); Clockwork **Pro** is paid above 10 users | ✅ Confirmed | Naming corrected throughout; **Rule 1** forbids ever depending on Clockwork Pro. |
| Clockwork Pro already offers timesheet reminders & reports | ✅ Confirmed | Competitive section (§13.1) rewritten to be honest about this; AutoClock's wedge re-scoped. |
| Write to Jira's **native** worklog API; Clockwork displays it (no separate Clockwork write) | ✅ Confirmed | Architecture and diagrams corrected ("Jira Worklogs", not "Jira Clockwork" as a write target). |
| Jira API tokens still work but some expire Mar–May 2026 | ✅ Confirmed | Build plan now says generate a **fresh token** right before HackFest. |

### 17.2 Improvements we accepted

- **Zero paid AI** — replaced the paid-Claude dependency with a free deterministic parser (§4.4). Aligns with Rule 1 and the reviewer's point that AI is not needed to convert "30m" to minutes.
- **Mandatory preview/confirm** before any write — made explicit in §4.2 and §10.
- **Gentler reminder cadence**, configurable, with an EOD-only option (§4.6) — addresses notification-fatigue risk.
- **Timezone (IST↔UTC) and leave/holiday handling** added (§4.5).
- **Scope discipline** — Employee flow + one dashboard is the build; the rest is mocked (§10).
- **Hosting** — self-host on an existing Iksula server, never a paid tier (§7.2).

### 17.3 Where we pushed back (with reasons)

- **"Kill the Chrome extension entirely."** We keep it — but strictly as a **stretch goal** built only if the core is done by hour 12 (§10). The extension is the right long-term surface for reminders; we just never start it before the web app works.
- **"Replace hourly reminders with a single EOD nudge."** We did not go all the way to EOD-only. Capturing while fresh is the core benefit. Instead we **softened the default cadence** and kept it user-configurable, including an EOD-only mode (§4.6).

### 17.4 Open items to confirm with Iksula (before the pilot)

1. How Jira API / OAuth access is granted — **Yogesh is confirming this with the Atlassian admin.**
2. The exact structure of the real Google Sheet timesheet (headers, formulas, merged cells).
3. The real EOD email template currently used.
4. Which existing Iksula server will host the backend.
5. The actual Jira project keys and any issue-level security that could block worklog creation.
6. The Google Workspace admin who can force-install the extension.
7. The leave/holiday source for the Operations 40-hour target.

---

## 18. Pre-Development Review Response (Codex)

After the docs were finalised, **Codex** ran a full pre-development engineering audit (file: `AutoClock_Codex_Review.md`). Its key technical claims were **verified on the web** and held up. This section logs what we changed.

### 18.1 Verified and accepted

| Codex finding | Verified | Action taken |
|---|---|---|
| **Scoped** Jira API tokens use `api.atlassian.com/ex/jira/{cloudId}`, not the site URL | ✅ | ADR-11 added; §7.1 corrected; Dev Doc handles both base URLs; **request a classic token** |
| Atlassian OAuth uses **rotating refresh tokens** | ✅ | ERD §7.2 + Dev Doc §6.5 now require storing the new refresh token each time |
| `gmail.compose` is a **restricted** Google scope | ✅ | Dev Doc §6.4 — OAuth consent screen must be set to **Internal** (avoids verification); pre-Friday task |
| The sync model can't do safe retry / can duplicate worklogs | ✅ judgement | **New table TB-13 `external_writes`** + ADR-09; `POST /day/close` is now idempotent (FR-22) |
| No login mechanism defined | ✅ | ADR-10 — **Google Workspace OIDC** sign-in; `users.google_sub` added (FR-23) |
| `AutoClock_Independent_Review.md` was an empty file | ✅ | File restored from the review record |
| Doc inconsistencies — 2-day vs 3-day token, FR-20/21 order, mockup "Hourly"/"Clockwork Connected"/67-user, OQ-1 over-claimed | ✅ | All corrected across the docs and the mockup |
| Parser validation too loose (0-duration could reach Jira) | ✅ | Dev Doc §4.4 — Confirm now blocks on `duration > 0`, `slot_end > slot_start`, etc. |
| Google demo auth path missing | ✅ | Dev Doc §3 + §6.4 — demo refresh token + Internal consent screen, set up before Friday |

### 18.2 Accepted with a nuance

- **"Cut EP-23 (worklog read-sync) from M0."** Agreed it is risky for a live 18-hour build — but not deleted. It is **demoted to P2 / stretch** (FR-21): built only if the core is solid by Hour 12, exactly like the Chrome extension. If it works it is a strong demo; if not, dashboards use seeded data.

### 18.3 Net effect

Codex's audit was sharp and largely correct — it found real gaps, including doc errors introduced during earlier edits. The fixes above close them. The project is now in a **build-ready** state once the pre-Friday checklist (OQ-1…OQ-6, Work Plan §3) is done.

---

*End of brainstorm.md v3 — AutoClock, Iksula HackFest 2026. Zero cost. Built for the real 60.*
