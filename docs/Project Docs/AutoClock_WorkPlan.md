<img src="AutoClock_Logo.png" width="240" alt="AutoClock logo" />

# AutoClock — Work Plan & Team Allocation

| | |
|---|---|
| **Project** | AutoClock — One-Click Daily Worklog & EOD Reporter |
| **Document** | Work Plan v1.0 |
| **Build window** | HackFest: **Fri 22 May 20:00 → Sat 23 May ~14:00** (18 hours) |
| **Team** | 5 — Tejas, Keval, Yogesh, Ravi, Ali |
| **Hard rules** | Zero cost · built for the real ~60 users |
| **Reads from** | `AutoClock_PRD.md` (FR), `AutoClock_ERD.md` (EP, TB, ADR) |

---

## 1. Team & Profile → Role Mapping

Each person's hackathon role is matched to their real strength.

| Person | Real-world profile | AutoClock role | Owns |
|---|---|---|---|
| **Tejas Dongre** | IT Infra Management · cost optimization · process improvement | **Infra & Integrations-Access Lead** | Repo, environments, secrets, hosting/deploy, Jira API access, demo-laptop, zero-cost audit |
| **Keval Parikh** | Development & debugging · fast learner · AI-assisted dev | **Backend Core Developer** | Node/Express server, DB, API endpoints, RBAC/auth, Jira worklog write, sync orchestrator |
| **Yogesh Mohite** | Sr. QA · built an AI tool · works on QA Nexus | **Project Lead · Parser · Frontend Flow · QA** | Architecture, the free parser, the employee log screen, testing, the demo & pitch |
| **Ravi Jayswal** | Data management · automated workflows · Google Sheets & Apps Script | **Google Integration & Data Developer** | Google Sheets append, Gmail draft, the node-cron Fri/Mon automation, DB seed data |
| **Ali** | Image editor · graphic designer · creative asset production | **UI/UX & Presentation Lead** | App styling from the mockup, dashboard polish, branding, pitch deck, demo video |

---

## 2. Ownership Map (which person owns which PRD/ERD item)

| Area | PRD / ERD refs | Owner | Support |
|---|---|---|---|
| Repo, env, secrets, hosting | ADR-03, ERD §12 | **Tejas** | Keval |
| Jira API access + token/OAuth | OQ-1, ERD §7.1–7.2 | **Tejas** | Yogesh |
| Backend server, DB schema | TB-01…TB-12, ERD §3 | **Keval** | Ravi |
| Auth + RBAC | EP-01, ERD §8 | **Keval** | — |
| Entry CRUD endpoints | EP-08…EP-11, FR-01/02 | **Keval** | Yogesh |
| Jira worklog write | EP-13, FR-05, §7.1 | **Keval** | Tejas |
| Free parser (durations, tidy, grouping) | FR-03, ADR-02 | **Yogesh** | — |
| Day preview + confirm | EP-12, FR-04 | **Yogesh** | Keval |
| Employee log screen (frontend) | FR-01/02/14 | **Yogesh** | Ali |
| Google Sheet append | EP-13, FR-06, §7.3 | **Ravi** | — |
| Gmail EOD draft | EP-13, FR-07, §7.4 | **Ravi** | — |
| Fri/Mon compliance cron | EP-17, FR-16 | **Ravi** | Keval |
| DB seed data | ERD §5.2 | **Ravi** | — |
| One role dashboard (PM/Lead) | EP-14, FR-10 | **Ali** | Yogesh |
| App styling / design system | mockup → real CSS | **Ali** | — |
| Pitch deck, demo video, branding | Launch checklist | **Ali** | Yogesh |
| QA, end-to-end testing | all FR | **Yogesh** | all |
| Zero-cost audit | GM-05, C-1 | **Tejas** | — |

---

## 3. Pre-HackFest Prep — do BEFORE Friday 20:00

The hard rule is "no blockers." These must be done in advance.

| # | Task | Owner | Why |
|---|---|---|---|
| P-1 | Confirm & generate a **fresh 3-day Jira API token** (created **Friday**) with *Browse Projects* + *Work On Issues* on PIM/ML/CUMI; test one worklog POST manually | **Tejas + Yogesh** | The #1 blocker risk |
| P-1b | **Operations member generates a 3-day token** from his account (broad "Browse Projects") — the reader account that pulls all worklogs for the dashboards (ERD §7.6) | **Tejas + Ops member** | Powers the real dashboard data |
| P-2 | Get a **copy of the real Google Sheet** timesheet; note headers, columns, formulas | **Ravi** | Prevent sheet corruption |
| P-3 | Get **3–5 real EOD emails** as templates | **Yogesh** | Match the real format |
| P-4 | Create a **Google Cloud project** + OAuth client (free); enable Sheets + Gmail; **set the OAuth consent screen to "Internal"** (avoids restricted-scope verification); capture a **demo refresh token** and test one `values.append` + one `drafts.create` | **Ravi** | Needed for Sheet/Gmail calls — and `gmail.compose` is a restricted scope |
| P-4b | Confirm the Jira token is **classic** (not scoped). If scoped, capture `cloudId` from `/_edge/tenant_info` | **Tejas** | Scoped tokens need a different base URL (ADR-11) |
| P-5 | Pick & confirm the **internal server / a laptop** to run the backend; install Node 18+, Git | **Tejas** | Hosting/run target |
| P-6 | Create the **Git repo**, branch strategy, shared `.env.example` | **Tejas** | Hour-0 ready |
| P-7 | Decide the **stack** (Node + Express, SQLite, React + Vite) — final, no debate on the day | **Keval + Yogesh** | Avoid hour-1 argument |
| P-8 | Export the **mockup design tokens** (colours, fonts, spacing) from `AutoClock_Designs.html` | **Ali** | Fast styling on the day |
| P-9 | Pre-write the **pitch-deck skeleton** (problem, solution, demo, impact, ask) | **Ali** | Hour-17 is too late to start |
| P-10 | Everyone installs tools (Node, VS Code, Chrome, an AI coding assistant) and clones the repo | **All** | No setup time lost on the day |

---

## 4. The 18-Hour Plan (per-person swimlanes)

> **Critical path:** API contract → backend endpoints → Jira write → preview/confirm → end-to-end sync. Protect it.

### Phase 0 — Setup · Hr 0–1 (Fri 20:00–21:00)
| Person | Task |
|---|---|
| Tejas | Stand up the repo on the host; share `.env`; verify the Jira token works with one live worklog POST |
| Keval | Scaffold the Express server + SQLite; create the DB schema (TB-01…TB-12) |
| Yogesh | **Freeze the JSON API contract** (all of EP-01…EP-23 — method, role, request, success + error shapes) — everyone codes against it. EP-23 is marked **pilot/stretch**, not M0 |
| Ravi | Verify the Google Cloud project; test a Sheets append + a Gmail draft with a script |
| Ali | Scaffold the React + Vite app; drop in the design tokens and the logo |

### Phase 1 — Foundations · Hr 1–5 (21:00–01:00)
| Person | Task |
|---|---|
| Keval | Auth + `role` field + RBAC middleware; `/api/projects`, `/api/projects/:id/tasks` (EP-06/07) |
| Yogesh | Free parser: duration regex + description tidy rules + group-by-ticket (FR-03); unit-test it |
| Ravi | Seed data (TB seed §5.2); build the Sheets-append module + the Gmail-draft module as standalone functions |
| Ali | Employee log screen UI — project + task dropdowns, entry form, "Today" list (styled) |
| Tejas | Wire deploy: PM2 on the host; CI-lite (a deploy script); confirm HTTPS |

### Phase 2 — Core Flow · Hr 5–9 (01:00–05:00)
| Person | Task |
|---|---|
| Keval | Entry CRUD endpoints (EP-08…EP-11); wire the parser into `/api/day/preview` (EP-12) |
| Yogesh | Frontend: connect the log screen to the API; build the **preview + confirm** screen (FR-04) |
| Ravi | `/api/day/close` sync orchestrator — Jira write + Sheets append + Gmail draft; **idempotent via the `external_writes` ledger** (ERD §6.8 — skip synced, retry failed, no duplicates); per-system status |
| Ali | Style the preview screen; build the PM/Lead dashboard layout (charts, team table) |
| Tejas | Pair with Keval on the Jira worklog write (EP-13, §7.1); handle IST→UTC conversion + 403/429 handling |

### Phase 3 — Integration · Hr 9–13 (05:00–09:00)
| Person | Task |
|---|---|
| Keval + Tejas | End-to-end "Close My Day" working on Yogesh's real Jira account |
| Ravi | Finish Sheet append against the **real** sheet copy; Gmail draft with the real template |
| Yogesh | Wire the dashboard to `/api/dashboard/team` (EP-14); QA the full employee flow |
| Ali | Finish dashboard polish + seeded sample data so it looks alive |
| **GATE @ Hr 12** | Core solid? → Keval+Yogesh start the **Chrome extension**. Shaky? → skip it, harden the core. |

### Phase 4 — Extension / Hardening + Test · Hr 13–16 (09:00–12:00)
| Person | Task |
|---|---|
| Keval | Chrome extension: `manifest.json`, service worker + `chrome.alarms`, popup → backend (if gate passed) |
| Yogesh | Full end-to-end QA on the **demo laptop**; fix the top 3 bugs; freeze the build |
| Ravi | **Stretch only** (build EP-23 worklog read-sync **only if the core sync works by Hour 12** — Codex re-sequencing): `worklog/updated` + `worklog/list` → real dashboard data. Otherwise harden sync retries and leave dashboards on seeded data |
| Ali | Final UI pass; build the pitch deck with real screenshots |
| Tejas | Lock the demo environment; pre-warm tokens; zero-cost audit sign-off |

### Phase 5 — Demo Prep · Hr 16–18 (12:00–14:00)
| Person | Task |
|---|---|
| Yogesh | Record the **backup demo video** on real data; rehearse the 60-second demo |
| Ali | Finalize the pitch deck; design the closing slide |
| Keval / Tejas / Ravi | Stand by to fix demo bugs; keep the environment frozen |
| All | **Two dry runs** of the full pitch + demo |

---

## 5. Decision Gates & Critical Path

- **Hr 1 — API contract frozen.** Nothing else starts until the JSON shapes are agreed (prevents rework).
- **Hr 9 — one real worklog written.** If "Close My Day" has not posted one real Jira worklog by hour 9, all hands move to the Jira integration; defer the dashboard.
- **Hr 12 — extension gate.** Build the extension *only* if the web core works end-to-end. Otherwise cut it cleanly (it is a P1 stretch — PRD §15 / ERD ADR-06).
- **Hr 16 — feature freeze.** No new features after hour 16. Only bug-fixes, the video, and the deck.

---

## 6. Post-HackFest — Pilot Plan for the Real 60 (M1)

| Week | Task | Owner |
|---|---|---|
| W1 | Self-host on the Iksula server; HTTPS; secrets; PM2; nightly SQLite backup | **Tejas** |
| W1 | Build per-user **Jira + Google OAuth onboarding** (replaces the demo token) — ERD §7.2 | **Keval** |
| W1 | Verify IST↔UTC against Clockwork; finalize the real Sheet append + EOD template | **Ravi** |
| W2 | RBAC hardening; full PM / Management / Operations / Admin consoles | **Keval + Yogesh** |
| W2 | Operations Friday/Monday **cron** live; leave calendar wired in (FR-16/17) | **Ravi** |
| W2 | UI polish across all role screens | **Ali** |
| W3 | Force-install the extension via Google Workspace Admin; onboard the first 5–10 users | **Tejas** |
| W3–4 | Onboard the rest of the ~60; run the 2-week success-metrics measurement (GM-01…05) | **Yogesh** |

---

## 7. Dependencies & Risks

| Risk | Likelihood | Mitigation | Owner |
|---|---|---|---|
| Jira API access not ready by Friday | High if not pre-done | P-1 + P-1b must be 100% done before HackFest (both tokens created Friday) | Tejas |
| Dashboards show only seeded data, not real | Medium | Wire the worklog read-sync (ERD §7.6) so dashboards show real hours since 1 Mar — stronger demo | Ravi |
| OAuth eats build time | High | Demo uses a personal API token; OAuth is a pilot task | Keval |
| Real Google Sheet corrupted by append | Medium | Test on a **copy** first (P-2) | Ravi |
| Scope creep beyond P0 | High | Phase gates §5; cut to P0 ruthlessly | Yogesh |
| Demo laptop / Wi-Fi fails | Medium | Backup video (Phase 5); deploy + test early | Yogesh |
| One person blocked / absent | Medium | Each area has a named "Support" person (§2) | All |
| Any paid dependency sneaks in | Low | Tejas runs a zero-cost audit at Hr 16 | Tejas |

---

## 8. Definition of Done (Hackathon)

A feature is "done" only when:
- It works end-to-end on the **demo laptop** (not just a dev machine).
- It uses **only free tools** (zero-cost audit passed).
- Yogesh has QA-tested the happy path **and** one error path.
- It is committed to the repo's main branch.

**Hackathon success =** the employee flow + "Close My Day" writes a real Jira worklog, a real Sheet row, and a real Gmail draft, one role dashboard renders, the backup video exists, and the pitch is rehearsed twice.

---

*Traceability: tasks reference FR (PRD), EP/TB/ADR (ERD). See `AutoClock_DevDoc.md` for the how-to detail.*

*End of Work Plan v1.0 — AutoClock, Iksula HackFest 2026.*
