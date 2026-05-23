<img src="AutoClock_Logo.png" width="240" alt="AutoClock logo" />

# AutoClock — Product Requirements Document (PRD)

| | |
|---|---|
| **Project** | AutoClock — One-Click Daily Worklog & EOD Reporter |
| **For** | Iksula HackFest 2026 → live pilot with ~60 employees |
| **Owner** | Yogesh Mohite (Sr. QA) |
| **Document** | PRD v1.0 |
| **Goal type** | Internal production tool (real users after the hackathon) |
| **Hard rules** | (1) **Zero cost** — only free / already-owned tools. (2) Built for the **real ~60 daily users.** |
| **Status** | Draft for build · HackFest: Fri 22 May 20:00 → Sat 23 May ~14:00 |
| **Companion docs** | `AutoClock_ERD.md` (engineering), `AutoClock_WorkPlan.md` (execution), `AutoClock_DevDoc.md` (developer reference), `brainstorm.md` (background) |

---

## 1. Executive Summary

Around 60 Iksula employees enter the **same time data three times every day** — a personal Google Sheet timesheet, Jira Clockwork worklogs ticket-by-ticket, and an end-of-day status email. AutoClock collapses that into **one entry**: the employee logs a short slot (picking project + Jira task), and at end of day one confirmed click posts the Jira worklogs, appends the Google Sheet, and drafts the EOD email. Five role-based views serve employees, leads, management, operations and an admin. The entire system runs on **free and already-owned tools** — no paid SaaS, no paid API, no paid hosting.

---

## 2. Problem Statement

Each employee, every working day:

1. Keeps a personal Google Sheet "Time sheet" (Time → Duration → Task Description).
2. Re-enters each item into **Jira Clockwork** — open ticket → gear → **+** → fill the Log Work dialog → save. 5–8 times.
3. Re-formats the same data into an **HTML EOD email** to their lead.

**Cost of the problem:** 10–15 minutes lost per person per day; forgotten hours reconstructed from memory at week-end; inconsistent Clockwork compliance; inaccurate project-costing data; QA leads and the Operations team spending time chasing missing logs.

---

## 3. Goals & North Star

**North Star Metric (NSM):** *Average time an employee spends logging a full day* — target **under 2 minutes** (from ~12 today).

| ID | Supporting goal | Target |
|---|---|---|
| GM-01 | Reduction in daily worklog time | ≥ 80% |
| GM-02 | Clockwork compliance across pilot teams | ≥ 95% |
| GM-03 | EOD email draft created for the user | 100% of pilot users |
| GM-04 | Employees actively using AutoClock after 2 weeks | ≥ 80% of the ~60 |
| GM-05 | Running cost of the system | ₹0 — always |

---

## 4. Non-Goals (Out of Scope)

- Replacing Jira, Clockwork, Google Sheets or Gmail — AutoClock *feeds* them, it does not replace them.
- Automatic background/activity tracking, screenshots, or keystroke monitoring — explicitly excluded (trust).
- A mobile native app (a responsive web app is enough; a PWA is a future item).
- Company-wide rollout to ~500 — possible later, **not** the build target.
- Any paid tier, paid API, or paid hosting — forbidden by the hard rule.
- A standalone chatbot — the plain-text input already covers it.

---

## 5. Target Users & Roles

| Role | Who | Primary need |
|---|---|---|
| **Employee** | The ~60 daily loggers (QA, dev, etc.) | Log the day in seconds; never open 3 systems |
| **PM / QA Lead** | Team leads (e.g., Priya K.) | See *their team's* hours & ticket effort; spot who hasn't logged |
| **Management** | Department heads | Org-wide utilization & trends — no ticket detail |
| **Operations** | Hours-compliance owner (e.g., Omkar P.) | Chase the weekly 40-hour fill; Fri/Mon reminders |
| **Admin** | System owner (IT) | Manage users, roles, project↔Jira mapping, integrations |

---

## 6. Jobs To Be Done & User Stories

Acceptance criteria use **Given / When / Then**.

**US-01 — Log a work slot.**
*As an Employee, I want to log a slot in ~20 seconds so I never reconstruct my day from memory.*
- Given I am logged in, When the reminder fires or I open AutoClock, Then I can pick a Project, pick the dependent Jira Task, type a description, and confirm a duration.
- Given I save a slot, Then it appears in my "Today" list immediately.

**US-02 — One-click EOD sync.**
*As an Employee, I want one click to push my whole day to all three systems.*
- Given I have logged slots, When I click "Close My Day", Then I see a **preview** grouped by ticket.
- Given I confirm the preview, Then AutoClock creates the Jira worklogs, appends the Google Sheet row(s), and creates the Gmail EOD draft — and shows a success state per system.
- Given any system fails, Then that item is marked failed and can be retried; the others still succeed.

**US-03 — Correct attribution.**
*As an Employee, I want my worklogs to show as **mine** in Clockwork.*
- Given I connected my own Jira account, When AutoClock posts a worklog, Then Clockwork shows it under my name (see ERD §7.1 — per-user auth).

**US-04 — Edit before sync.**
*As an Employee, I want to fix a wrong entry before it is written.*
- Given an entry in "Today", When I edit or delete it, Then the change is reflected before "Close My Day".

**US-05 — Reminder, not nag.**
*As an Employee, I want a gentle reminder, not constant pings.*
- Given the default cadence, Then I get a few nudges a day, not one every hour.
- Given I open Settings, Then I can change the cadence or switch to end-of-day-only.

**US-06 — Team view (PM/Lead).**
*As a Lead, I want to see only my team's hours and ticket effort.*
- Given I am a Lead, When I open the dashboard, Then I see my team only — never other teams.
- Then I see effort by Jira ticket, a "not logged today" list, and a per-member table.

**US-07 — Org view (Management).**
*As Management, I want utilization and trends across all teams.*
- Given I am Management, Then I see org-wide utilization, project portfolio and multi-week trends — not per-ticket detail.

**US-08 — Weekly compliance chase (Operations).**
*As Operations, I want to chase everyone under the weekly target.*
- Given Friday 1 PM, When the check runs (cron or "Run now"), Then everyone below the leave-adjusted target gets a reminder email and the run is logged.
- Given Monday 1 PM, When the re-check runs, Then anyone who has since complied is dropped and only the rest are re-emailed.

**US-09 — Leave-aware targets.**
*As Operations, I want the 40-hour target to account for leave.*
- Given an employee has approved leave, Then their weekly target is reduced by 8h per leave day and they are not chased for that time.

**US-10 — System setup (Admin).**
*As Admin, I want to manage users, roles and the project↔Jira mapping.*
- Given I am Admin, Then I can add/disable users, set roles, and define each Project with its Jira key (which powers the Employee task dropdown).

**US-11 — Log fully from the browser.**
*As an Employee, I want to do everything from the Chrome extension.*
- Given the extension popup, Then I can add an entry (project → task → describe → save) and run "Close My Day" without opening the web app.

---

## 7. Core User Flows

**Flow A — Log a slot (web or extension)**
1. Reminder fires → user opens AutoClock.
2. Select **Project** → dependent **Jira Task** dropdown loads.
3. Type description → adjust duration/slot → **Save**.
4. Entry appears in "Today".

**Flow B — Close My Day (the magic moment)**
1. User clicks **Close My Day**.
2. AutoClock groups entries by ticket, sums durations, tidies descriptions (free parser).
3. **Preview screen** shows exactly what will be written.
4. User clicks **Confirm**.
5. Backend, using the user's own tokens: posts Jira worklogs → appends Google Sheet → creates Gmail draft.
6. Per-system success/fail shown; failed items retryable.

**Flow C — Operations weekly chase**
1. Fri 1 PM: cron (or "Run Friday Check Now") computes each person's weekly hours vs leave-adjusted target.
2. Under-target users get a reminder email; the run + recipients are logged.
3. Mon 1 PM: re-check; compliant users dropped; the rest re-emailed; escalate to lead if still short.

**Flow D — First-time connect (pilot onboarding)**
1. New user signs in to AutoClock.
2. User connects their **Jira** account (OAuth consent) and their **Google** account (OAuth consent).
3. AutoClock stores per-user tokens (encrypted) and is ready to log on their behalf.

---

## 8. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Employee can create, edit, delete a work entry (project, Jira task, description, duration, slot) | P0 |
| FR-02 | Project dropdown → dependent Jira-task dropdown (tasks scoped to the project) | P0 |
| FR-03 | Free deterministic parser: normalize durations, tidy descriptions, group by ticket | P0 |
| FR-04 | "Close My Day" preview + confirm before any external write | P0 |
| FR-05 | Post worklogs to Jira via the **user's own** auth → Clockwork displays them | P0 |
| FR-06 | Append a row to the user's Google Sheet timesheet | P0 |
| FR-07 | Create a Gmail EOD draft in the user's account | P0 |
| FR-08 | Per-system success/failure status + retry of failed items | P0 |
| FR-09 | RBAC — 5 roles, each restricted to its own scope | P0 |
| FR-10 | PM/Lead dashboard — team-scoped delivery metrics | P1 |
| FR-11 | Management dashboard — org-wide strategic metrics | P1 |
| FR-12 | Operations console — weekly compliance tracker + reminder queue + history | P1 |
| FR-13 | Admin console — users, roles, project↔Jira mapping, integrations, settings | P1 |
| FR-14 | Chrome extension — full entry + reminders + "Close My Day" | P1 |
| FR-15 | Configurable reminder cadence (incl. EOD-only) | P1 |
| FR-16 | Friday/Monday compliance cron + manual "Run now" | P1 |
| FR-17 | Leave/holiday calendar adjusts the weekly target | P1 |
| FR-18 | Timezone handling — IST entry ↔ UTC for Jira | P0 |
| FR-19 | All secrets/tokens encrypted at rest; never in the repo | P0 |
| FR-20 | "Reconstruct Yesterday" from Jira activity | P3 (future) |
| FR-21 | Read **all** employees' worklogs from Jira (via one Browse-Projects account) for the Operations & Management dashboards — including history (e.g. from 1 Mar 2026) | P2 (stretch / pilot) |
| FR-22 | **Idempotent "Close My Day"** — per-system status, retry of failed systems, no duplicate writes on double-click or refresh (via the `external_writes` ledger) | P0 |
| FR-23 | AutoClock sign-in via **Google Workspace OIDC** — no passwords stored | P1 |

P0 = must, P1 = should (hackathon if time / pilot), P2 = stretch, P3 = future.
**Phase mapping (per Codex review):** **P0 = M0** (built at the hackathon) · **P1 = M1** (pilot) · **P2 = stretch** (only if the core is solid by Hour 12) · **P3 = future**. See ERD §14.1.

**Jira access model (3 credentials — see ERD §4 / §7):** (a) **each employee's own** Jira credential writes *their* worklogs; (b) **one broad "Browse Projects" account** (the Operations member's) reads *all* worklogs for the dashboards; (c) the Atlassian **org admin** key is optional and only imports the user roster — it cannot touch Jira worklogs. AutoClock needs **no Clockwork access** — Clockwork merely displays native Jira worklogs.

---

## 9. Error States & Edge Cases

| Case | Expected behaviour |
|---|---|
| Jira worklog POST returns 403 (no permission on ticket) | Mark that entry failed with a clear message; do not block the others; surface "ask your lead for issue access" |
| Jira / Google API rate-limited (429) | Retry with exponential backoff + jitter; if still failing, queue for retry and tell the user |
| User's OAuth token expired | Prompt the user to reconnect; never silently drop data |
| Overlapping time slots (e.g., 9:00–10:00 and 9:30–10:30) | Flag the overlap in the preview; let the user confirm or fix |
| Total logged > 24h in a day | Block "Confirm" with a validation message |
| "1.5h" / "90m" / "1h30" durations | Deterministic parser normalizes all to minutes |
| Jira is down during EOD sync | Queue the worklogs; retry; the Sheet + Gmail still proceed |
| Google Sheet has formulas/merged cells | Append only to the defined data range; validated against a copy first |
| Employee on approved leave | Excluded from the Operations chase for those days |
| Network offline (extension) | **M0:** popup shows a clear "offline — not saved" state. **M1:** local `chrome.storage` queue + reconciliation on reconnect (ERD §14.6) |

---

## 10. Privacy, Security & Compliance

- **Per-user authentication** — each employee connects their own Jira and Google accounts; AutoClock never uses one shared bot account (see ERD §7). Worklogs are correctly attributed; data access stays within each user's own permissions.
- **No surveillance** — no screenshots, no keystroke logging, no background activity capture. AutoClock only stores what the employee explicitly types.
- **Data minimization** — store only worklog entries, durations, descriptions, and the per-user tokens needed to write to Jira/Google.
- **Secrets** — all tokens encrypted at rest; environment variables only; never committed.
- **RBAC** — employees see only their own data; leads see their team; management sees aggregates; operations sees hours (not ticket detail); admin configures.
- **Self-hosted** — runs on an Iksula internal server; no employee data leaves the Iksula network.
- **Retention** — worklog data kept for the period Iksula's policy requires; a user's data is removable on request.

---

## 11. Accessibility

Target **WCAG 2.1 AA basics**: keyboard-navigable forms and buttons; visible focus states; colour contrast ≥ 4.5:1 for text; status never communicated by colour alone (icon + text); readable default font sizes. Full audit is a post-pilot item.

---

## 12. Constraints & Assumptions

- **C-1 (hard):** Zero cost — every component free or already owned.
- **C-2 (hard):** Built for the real ~60 daily users.
- **C-3:** Hackathon build window is 18 hours.
- **C-4:** Iksula already has Jira (with Clockwork Lite/Free) and Google Workspace — AutoClock adds no new subscription.
- **A-1 (assumption):** An existing Iksula internal server is available to self-host the backend. *(Confirm with Tejas / IT Infra.)*
- **A-2 (resolved):** Jira access confirmed with the admin — hackathon uses a 3-day personal API token; the pilot uses OAuth 2.0 (3LO). The org admin API key is **not** usable for Jira worklogs (admin API only). The Operations member's account provides the broad "Browse Projects" read access for dashboards. Needs **only** the *Browse Projects* + *Work On Issues* permissions.
- **A-3:** ≥ 80% of the 60 use Chrome as their primary browser (extension assumption — to verify).

---

## 13. Release / Launch Checklist

**Hackathon (Sat 23 May):**
- [ ] Employee log flow works end-to-end on one real user (Yogesh's token).
- [ ] "Close My Day" writes a real Jira worklog, a real Sheet row, a real Gmail draft.
- [ ] One role dashboard renders with seeded data.
- [ ] Backup demo video recorded.
- [ ] 60-second pitch + dry run done.

**Pilot (2–4 weeks after):**
- [ ] Self-hosted on the Iksula server; HTTPS; secrets in env.
- [ ] Per-user Jira + Google OAuth onboarding built and tested.
- [ ] Timezone (IST↔UTC) verified against Clockwork.
- [ ] Leave calendar wired into the Operations target.
- [ ] Extension force-installed via Google Workspace Admin.
- [ ] 5–10 users onboarded first, then the rest of the 60.

---

## 14. Success Metrics & Pilot

Measured over a 2-week pilot with the ~60 users — see GM-01…GM-05 (§3). The headline: a full day logged in **under 2 minutes**, **zero running cost**, and **≥ 80%** of the 60 still using it after two weeks.

---

## 15. Milestones (overview — detail in the Work Plan)

| Phase | Outcome |
|---|---|
| M0 — HackFest (18h) | Working prototype: employee flow + one dashboard, on one user's token |
| M1 — Pilot rollout (2–4 wks) | Self-hosted, per-user OAuth, hardened, the ~60 onboarded |
| M2 — Full roles (1–2 mo) | PM / Management / Operations / Admin consoles complete; Fri/Mon cron live |
| M3 — Optional later | Wider rollout only if leadership asks |

---

## 16. Open Questions & Risks

| ID | Item | Owner |
|---|---|---|
| OQ-1 | Jira access — *partially resolved*: model agreed (3-day token → OAuth). **Still to confirm before Friday:** classic vs scoped token, exact site URL + project keys, issue-level security, reader-account token | Yogesh + Tejas |
| OQ-2 | Which Iksula server hosts the backend | Tejas |
| OQ-3 | Exact structure of the real Google Sheet timesheet (tab name, columns, formulas) | Ravi |
| OQ-4 | The current EOD email template (recipients, subject, HTML) | Yogesh |
| OQ-5 | Leave/holiday data source for the Operations target | Tejas / HR |
| OQ-6 | Google Cloud project + **Internal** OAuth consent screen + demo refresh token created before Friday | Ravi |
| R-1 | Scope creep across 5 roles in 18h | Mitigated by ruthless P0/P1 split |
| R-2 | Notification fatigue | Mitigated by gentle, configurable cadence |
| R-3 | Clockwork Pro overlaps some features | Wedge re-scoped honestly (see brainstorm §13.1) |

---

*Traceability: GM = goal metric · US = user story · FR = functional requirement. The ERD references these IDs; the Work Plan references ERD components.*

*End of PRD v1.0 — AutoClock, Iksula HackFest 2026. Zero cost. Built for the real 60.*
