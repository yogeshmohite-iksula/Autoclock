// mocks.js — in-memory mock backend for the frontend.
// Shapes follow docs/Project Docs/AutoClock_ERD.md §6 exactly so swapping to
// the real backend is a one-flag flip. Mock-only UI affordances (project
// color, tag) live alongside but are clearly labelled — the real backend may
// or may not return them; the UI gracefully falls back.

// ---- mock identity ---------------------------------------------------------

const MOCK_USER = {
  id: 1,
  name: 'Yogesh Mohite',
  email: 'yogesh@iksula.com',
  role: 'employee',
  team_id: 1,
  // 'active' on first boot so the demo flow walks through onboarding.
  // OnboardingPage flips this to 'connected' on Finish; the route guard
  // (RequireOnboarded) then admits the user to /today.
  onboarding_status: 'active',
};

// ---- mock catalogue --------------------------------------------------------
// `color` + `tag` are mock-only UI affordances. The ERD `projects` table
// doesn't define them today — flagged in the PR as a potential future addition.

const PROJECTS = [
  { id: 1, name: 'SiteOne PIMCore',         jira_project_key: 'PIM',     color: '#2563EB', tag: 'CLIENT'   },
  { id: 2, name: 'Modern Electronics Lego', jira_project_key: 'ML',      color: '#10B981', tag: 'CLIENT'   },
  { id: 3, name: 'CUMI Pimcore',            jira_project_key: 'CUMI',    color: '#F59E0B', tag: 'CLIENT'   },
  { id: 4, name: 'Internal / Meetings',     jira_project_key: 'INTERNAL', color: '#8B5CF6', tag: 'INTERNAL' },
  { id: 5, name: 'Bench',                   jira_project_key: 'BENCH',   color: '#64748B', tag: 'INTERNAL' },
];

const TASKS_BY_PROJECT = {
  1: [
    { id: 101, jira_key: 'PIM-3066', summary: 'Reviewed PR for supplier import script' },
    { id: 102, jira_key: 'PIM-3068', summary: 'SKU variant mapping — test coverage' },
    { id: 103, jira_key: 'PIM-3072', summary: 'Catalog import escalation' },
    { id: 104, jira_key: 'PIM-3073', summary: 'Catalog import bug — CSV parser crash' },
    { id: 105, jira_key: 'PIM-3081', summary: 'Image CDN failover smoke tests' },
  ],
  2: [
    { id: 201, jira_key: 'ML-1044', summary: 'Wishlist sync' },
    { id: 202, jira_key: 'ML-1045', summary: 'Cart pricing — discount stack' },
  ],
  3: [
    { id: 301, jira_key: 'CUMI-388', summary: 'Workflow approval rules' },
    { id: 302, jira_key: 'CUMI-410', summary: 'Master data ingestion' },
  ],
  4: [
    { id: 401, jira_key: 'INTERNAL-1', summary: 'Daily Scrum' },
    { id: 402, jira_key: 'INTERNAL-2', summary: 'Backlog Grooming' },
    { id: 403, jira_key: 'OPS-412',    summary: 'QA standup' },
  ],
  5: [
    { id: 501, jira_key: 'BENCH-1', summary: 'Bench / learning' },
  ],
};

// ---- mock day -------------------------------------------------------------
// Match the joined shape backend/routes/entries.js returns (entry + jira_key + project_name).
const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

const today = TODAY_ISO();
let TODAY_ENTRIES = [
  { id: 1, user_id: 1, project_id: 1, jira_task_id: 101, description: "Reviewed Riya's PR for supplier import — 4 comments, approved after a tiny rebase.", duration_minutes: 60, slot_start: '07:30', slot_end: '08:30', work_date: today, status: 'draft', jira_worklog_id: null, error_message: null, jira_key: 'PIM-3066', project_name: 'SiteOne PIMCore' },
  { id: 2, user_id: 1, project_id: 1, jira_task_id: 102, description: 'Wrote 15 test cases for SKU-variant mapping. 2 edge cases flagged to dev.', duration_minutes: 90, slot_start: '08:30', slot_end: '10:00', work_date: today, status: 'draft', jira_worklog_id: null, error_message: null, jira_key: 'PIM-3068', project_name: 'SiteOne PIMCore' },
  { id: 3, user_id: 1, project_id: 4, jira_task_id: 403, description: 'QA standup. Flagged the catalog-import regression — dev pulled it into the active sprint.', duration_minutes: 30, slot_start: '10:00', slot_end: '10:30', work_date: today, status: 'draft', jira_worklog_id: null, error_message: null, jira_key: 'OPS-412', project_name: 'Internal / Meetings' },
  { id: 4, user_id: 1, project_id: 1, jira_task_id: 103, description: 'Triaged 14 catalog import tickets. Grouped into 3 root causes; #1 already fixed on staging.', duration_minutes: 90, slot_start: '10:30', slot_end: '12:00', work_date: today, status: 'draft', jira_worklog_id: null, error_message: null, jira_key: 'PIM-3072', project_name: 'SiteOne PIMCore' },
  { id: 5, user_id: 1, project_id: 4, jira_task_id: 402, description: 'Paired with Anuja on the new Playwright fixture — auth helper works; parallel runner still flaky.', duration_minutes: 60, slot_start: '12:00', slot_end: '13:00', work_date: today, status: 'draft', jira_worklog_id: null, error_message: null, jira_key: 'INTERNAL-2', project_name: 'Internal / Meetings' },
];

let nextEntryId = 100;

// ---- onboarding mock state ------------------------------------------------
// No EP for this yet; flagged as OQ-F3 in docs/frontend-plan.md.
let CONNECTIONS = { jira: 'connected', google: 'idle' };  // changeable at runtime via setConnectionStatus

export function setConnectionStatus(provider, status) {
  CONNECTIONS = { ...CONNECTIONS, [provider]: status };
  return { ...CONNECTIONS };
}

// ---- helpers ---------------------------------------------------------------

function ok(data) { return data; }
function paramOf(path, name) {
  const u = new URL(path, 'http://x');
  return u.searchParams.get(name);
}
function pathMatch(pattern, path) {
  // turn "/api/projects/:id/tasks" into a regex
  const re = new RegExp('^' + pattern.replace(/:[a-z_]+/gi, '([^/?]+)') + '(?:\\?.*)?$');
  const m = path.match(re);
  return m ? m.slice(1) : null;
}

// ---- dispatch table -------------------------------------------------------
// Each entry: [METHOD, "/path/template", handler(body, ...pathParams)]
// Returned by client.js when VITE_USE_MOCKS is truthy.

const ROUTES = [
  // EP-01 sign-in (M0 demo: accept any @iksula.com email)
  ['POST', '/api/auth/login', (body) => {
    if (!body?.email || !/^[^@]+@iksula\.com$/i.test(body.email)) {
      const e = new Error('That account isn’t eligible. Use your @iksula.com account.');
      e.status = 401; throw e;
    }
    return ok({ user: { ...MOCK_USER, email: body.email, name: humanise(body.email) } });
  }],
  ['GET',  '/api/auth/me',     () => ok({ user: MOCK_USER })],
  ['POST', '/api/auth/logout', () => ok({ ok: true })],

  // EP-06
  ['GET',  '/api/projects', () => ok({ projects: PROJECTS })],

  // EP-07
  ['GET',  '/api/projects/:id/tasks', (_body, id) => {
    const list = TASKS_BY_PROJECT[parseInt(id, 10)] || [];
    return ok({ tasks: list });
  }],

  // EP-08
  ['GET',  '/api/entries', (_body, _full, path) => {
    const date = paramOf(path, 'date') || today;
    const list = TODAY_ENTRIES.filter(e => e.work_date === date);
    return ok({ entries: list });
  }],

  // EP-09
  ['POST', '/api/entries', (body) => {
    const proj = PROJECTS.find(p => p.id === body.project_id);
    const task = (TASKS_BY_PROJECT[body.project_id] || []).find(t => t.id === body.jira_task_id);
    const entry = {
      id: ++nextEntryId,
      user_id: MOCK_USER.id,
      project_id: body.project_id,
      jira_task_id: body.jira_task_id,
      description: body.description,
      duration_minutes: body.duration_minutes,
      slot_start: body.slot_start,
      slot_end: body.slot_end,
      work_date: body.work_date || today,
      status: 'draft',
      jira_worklog_id: null,
      error_message: null,
      jira_key: task?.jira_key || '',
      project_name: proj?.name || '',
    };
    TODAY_ENTRIES = [...TODAY_ENTRIES, entry];
    return ok({ entry });
  }],

  // EP-10
  ['PUT', '/api/entries/:id', (body, id) => {
    const idx = TODAY_ENTRIES.findIndex(e => e.id === parseInt(id, 10));
    if (idx < 0) { const e = new Error('entry not found'); e.status = 404; throw e; }
    TODAY_ENTRIES[idx] = { ...TODAY_ENTRIES[idx], ...body };
    return ok({ entry: TODAY_ENTRIES[idx] });
  }],

  // EP-11
  ['DELETE', '/api/entries/:id', (_body, id) => {
    TODAY_ENTRIES = TODAY_ENTRIES.filter(e => e.id !== parseInt(id, 10));
    return ok({ ok: true });
  }],

  // EP-12 — minimal preview; the real backend uses the deterministic parser
  ['POST', '/api/day/preview', (body) => {
    const date = body?.work_date || today;
    const entries = TODAY_ENTRIES.filter(e => e.work_date === date);
    const groups = entries.reduce((acc, e) => {
      const g = acc.find(x => x.jira_key === e.jira_key) || (acc.push({ jira_key: e.jira_key, minutes: 0, lines: [] }), acc[acc.length - 1]);
      g.minutes += e.duration_minutes;
      g.lines.push(e.description);
      return acc;
    }, []);
    const total_minutes = entries.reduce((a, e) => a + e.duration_minutes, 0);
    return ok({ work_date: date, groups, total_minutes, warnings: [], errors: [] });
  }],

  // EP-13 — fake idempotent close
  ['POST', '/api/day/close', () => ok({
    jira:  { ok: 5, failed: 0, worklog_ids: ['100231','100232','100233','100234','100235'] },
    sheet: { ok: true, rows_appended: 5 },
    gmail: { ok: true, draft_id: 'r-559abc' },
    overall: 'ok',
  })],

  // EP-14 — minimal team dashboard
  ['GET', '/api/dashboard/team', () => ok({
    team_id: 1,
    kpis: { team_logged_today: 1 },
    by_ticket: [],
    not_logged_today: [],
    members: [{ id: 1, name: 'Yogesh Mohite', minutes_today: TODAY_ENTRIES.reduce((a,e) => a + e.duration_minutes, 0) }],
  })],

  // Onboarding-connections (NO EP yet — mock only; see OQ-F3)
  ['GET', '/api/auth/connections', () => ok({ ...CONNECTIONS })],
];

function humanise(email) {
  const local = email.split('@')[0];
  return local.split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export function dispatch(method, path, body) {
  for (const [m, pattern, handler] of ROUTES) {
    if (m !== method) continue;
    // Strip the query string before matching the path template; pass full path to handler.
    const pathOnly = path.split('?')[0];
    const params = pathMatch(pattern, pathOnly);
    if (params) return () => handler(body, ...params, path);
  }
  return null;
}

// Exposed for tests / route-internal use
export const __mocks = { PROJECTS, TASKS_BY_PROJECT, MOCK_USER, get TODAY_ENTRIES() { return TODAY_ENTRIES; }, get CONNECTIONS() { return CONNECTIONS; } };
