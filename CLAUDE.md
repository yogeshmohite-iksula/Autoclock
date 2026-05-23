# AutoClock — Claude Code Project Memory

## 1. Project Goals
**AutoClock** is an internal Iksula tool. An employee logs their workday once and it fans out to (1) Jira worklogs, (2) a Google Sheet timesheet, and (3) a Gmail EOD draft. Built for **~60 real daily users** post-HackFest. Current milestone: **M0** (18-hour HackFest build).

## 2. Architecture Overview
```
[Chrome Extension MV3]   [Web App (React+Vite)]
         \                    /
          \   HTTPS REST     /
           \                /
       [Backend: Node+Express, SQLite WAL, PM2 — self-hosted]
              |          |          |
          Jira API   Sheets API  Gmail API   (per-user OAuth)
```
Data flow: see `docs/ARCHITECTURE.md`. DB schema: 13 tables (TB-01..TB-13) in `backend/schema.sql`. API: 23 endpoints (EP-01..EP-23) under `backend/routes/`.

## 3. Design Style Guide
Visual system: `docs/AutoClock_Designs.html` (7-screen mockup). Brand assets: `docs/AutoClock_Logo*.svg/png`. Tokens (colours, fonts, spacing) should be extracted from the mockup into `web/src/assets/tokens.css`. WCAG 2.1 AA basics required (contrast, keyboard nav, focus rings).

## 4. Product & UX Guidelines
- Logging a slot: **≤ 20 seconds** (North Star).
- A full day logs in **< 2 minutes** total.
- "Close My Day" always shows a **preview + confirm** before any external write (FR-04).
- Reminder cadence is **gentle and configurable**, never one-per-hour by default (ADR-07).
- No surveillance: no screenshots, no keystroke capture, no background activity tracking.

## 5. Constraints & Policies — NEVER / ALWAYS / MUST
- **NEVER** add a paid SaaS, paid API, paid hosting, or per-user licence. Zero cost is a **hard rule**, not an aspiration (GM-05).
- **NEVER** deploy to Vercel or any serverless platform — SQLite needs persistent disk, `node-cron` needs an always-on process (ADR-03).
- **NEVER** commit a populated `.env`, real API token, OAuth secret, or `*.db` file.
- **NEVER** expose `JIRA_API_TOKEN`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `SESSION_SECRET`, or any `*_REFRESH_TOKEN` in client code, logs, or commits.
- **NEVER** write to a real Google Sheet during development — test against a **copy** until verified (DevDoc §11).
- **NEVER** call Clockwork's API — it is a paid Pro feature. AutoClock writes only to native Jira worklogs; Clockwork displays them automatically (ADR-05).
- **ALWAYS** encrypt OAuth tokens at rest using AES-256-GCM with `TOKEN_ENC_KEY` (DevDoc §6.6). Format: `iv:authTag:ciphertext`, each base64.
- **ALWAYS** make `POST /api/day/close` idempotent via the `external_writes` ledger (TB-13, ADR-09). Skip rows already `synced`; retry `failed` only.
- **ALWAYS** convert IST → UTC with `+0530` when writing Jira worklogs (ERD §11). Test against Clockwork.
- **ALWAYS** validate parser output **before** Confirm: `duration_minutes > 0`, `slot_end > slot_start`, total ≤ 24h, non-empty description, valid `jira_task_id` (DevDoc §4.4).
- **ALWAYS** enforce RBAC server-side; never trust a role claim from the client (ERD §8).
- **MUST** keep this file under 200 lines — link to docs with `@` imports.
- **MUST** keep context ≤ 50% — use sub-agents or `/compact` before continuing.

Extended security rules (token-body logging, rotating refresh-token atomic overwrite, input validation at trust boundaries) live in `.claude/rules/security.md` — auto-loaded; read before touching `auth/` or `services/crypto.js`.

## 6. Repository Etiquette
1. Branch from `main`: `feat/backend`, `feat/jira-sync`, `feat/frontend`, `feat/extension`.
2. Commit small and often — clear imperative messages ("add EP-09 entry create").
3. Push your branch and open a Pull Request into `main`.
4. Yogesh is the **only merger to `main`** — no direct pushes.
5. PR must reference the FR/EP/TB/ADR ID it implements.
6. The API contract (ERD §6) is **frozen at Hr 1** of HackFest — changing it needs team OK.

## 7. Commands
| Where | Command | What |
|---|---|---|
| `backend/` | `npm run dev` | Express on `:4000` (auto-reload via `node --watch`) |
| `backend/` | `npm start` | Production server |
| `backend/` | `npm run init-db` | Bootstrap schema from `schema.sql` into the SQLite file |
| `backend/` | `npm run verify-db` | Sanity-check the DB (`scripts/verify-db.js`) |
| `backend/` | `npm test` | Backend tests — Node built-in runner (`node --test test/`) |
| `backend/` | `node --test test/<file>.test.js` | **Run a single backend test file** |
| `backend/` | `npm run pm2:start` \| `pm2:logs` \| `pm2:stop` | PM2 controls for self-hosted deploy |
| `web/` | `npm run dev` | Vite on `:5173` — **requires backend running on `:4000` first** |
| `web/` | `npm run build` | Production build → `web/dist/` |
| `web/` | `npm run preview` | Serve the built bundle |
| `web/` | `npm test` | **Playwright via CLI** — `npx playwright test` |
| `web/` | `npm run test:headed` | Playwright with a visible browser (debugging) |
| `web/` | `npx playwright test tests/<f>.spec.js` | **Run a single E2E file** |
| `web/` | `npx playwright test -g "pattern"` | **Run E2E tests by name match** |

First-time setup: `cp .env.example backend/.env` (the populated env lives at **`backend/.env`**, not repo root), then `npm run init-db` in `backend/` before `npm run dev`.

## 8. Testing
MVP manual checklist (every PR):
- [ ] Employee log: pick project → task → description → save → appears in Today.
- [ ] Close My Day: preview shows grouped tickets + total minutes; Confirm writes Jira + Sheet + Gmail.
- [ ] Re-clicking Confirm does NOT duplicate (idempotency via `external_writes`).
- [ ] One error path tested (e.g., 403 from Jira on a forbidden ticket).

E2E: **Playwright CLI** (`npx playwright test`). Never Playwright MCP.

## 9. Environment Variables
See `.env.example` at repo root for full list and DevDoc §3 for explanations. Critical: `TOKEN_ENC_KEY`, `SESSION_SECRET`, `JIRA_*`, `GOOGLE_*`.

## 10. Documentation
- @docs/AutoClock_PRD.md — Requirements (FR-01..FR-23, OQ-1..OQ-6)
- @docs/AutoClock_ERD.md — Engineering doc + tables TB-01..TB-13 + endpoints EP-01..EP-23 + ADRs
- @docs/AutoClock_DevDoc.md — Hands-on integration how-tos
- @docs/AutoClock_WorkPlan.md — 18-hour swimlanes
- @docs/brainstorm.md — Master concept
- @docs/PROJECT_SPEC.md — Synthesized project spec
- @docs/ARCHITECTURE.md — System architecture
- @docs/MILESTONES.md — M0 / M1 / Stretch
- @docs/SECURITY.md — Security policy

## 11. Compact Instructions
When compacting, **preserve**: test output, code changes, current task state, architecture decisions (ADRs), open question status (OQ-1..OQ-6), and any FR/EP/TB references in flight. **Discard**: exploration output, verbose logs, file listings already indexed, repeated diffs.
