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
  // pm_lead so the demo viewer can see the role-gated /team route from
  // feat/frontend-allpages (P08 Team Dashboard). RequireRole admits pm_lead +
  // admin; everyone authed still sees Today/History/Settings. Settings page
  // still displays "PM / Lead" via ROLE_LABELS — verified manually.
  role: 'pm_lead',
  team_id: 1,
  // 'active' on first boot so the demo flow walks through onboarding.
  // OnboardingPage flips this to 'connected' on Finish; the route guard
  // (RequireOnboarded) then admits the user to /today.
  onboarding_status: 'active',
};

// In-memory "session" — null until a real /api/auth/login. Mirrors the real
// backend: GET /api/auth/me returns 401 when there's no session. This makes
// SignInPage the first screen on boot (was broken when /me unconditionally
// returned MOCK_USER and the route guards bounced straight to /onboarding).
let SESSION_USER = null;

/** Mock-only helper used by OnboardingPage.onFinish so a /today refresh
 *  in mock mode keeps the onboarded user signed in. */
export function setMockOnboardingComplete() {
  if (SESSION_USER) SESSION_USER = { ...SESSION_USER, onboarding_status: 'connected' };
}

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
// Both providers start 'idle' so the demo flow walks the full Connect-Jira →
// Connect-Google → Finish path (was 'connected'/'idle' which skipped the Jira step).
let CONNECTIONS = { jira: 'idle', google: 'idle' };

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
    SESSION_USER = { ...MOCK_USER, email: body.email, name: humanise(body.email) };
    return ok({ user: SESSION_USER });
  }],
  ['GET',  '/api/auth/me', () => {
    if (!SESSION_USER) { const e = new Error('Not signed in'); e.status = 401; throw e; }
    return ok({ user: SESSION_USER });
  }],
  ['POST', '/api/auth/logout', () => { SESSION_USER = null; return ok({ ok: true }); }],

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

  // EP-12 — minimal preview; the real backend uses the deterministic parser.
  // Mock enriches each group with display-only fields (proj_name, color, slot_count,
  // time_meta, title) so CloseMyDayPage can render the design fidelity. The real
  // backend will return only the contract fields (jira_key, minutes, lines) and
  // the page falls back gracefully via lookups against the projects/tasks payloads.
  ['POST', '/api/day/preview', (body) => {
    const date = body?.work_date || today;
    const entries = TODAY_ENTRIES.filter(e => e.work_date === date);
    const groups = entries.reduce((acc, e) => {
      const proj = PROJECTS.find(p => p.id === e.project_id);
      const tasks = TASKS_BY_PROJECT[e.project_id] || [];
      const task = tasks.find(t => t.id === e.jira_task_id);
      let g = acc.find(x => x.jira_key === e.jira_key);
      if (!g) {
        g = {
          jira_key: e.jira_key,
          minutes: 0,
          lines: [],
          slot_count: 0,
          title: task?.summary || e.jira_key,
          proj_name: proj?.name || e.project_name,
          color: proj?.color || '#64748B',
          initial: (proj?.name || 'X').trim()[0]?.toUpperCase() || 'X',
          slots: [],
        };
        acc.push(g);
      }
      g.minutes += e.duration_minutes;
      g.lines.push(e.description);
      g.slot_count += 1;
      g.slots.push(`${e.slot_start}-${e.slot_end}`);
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

  // EP-14 — extended team dashboard (OQ-AP-07)
  // Returns { team, range, kpis: {hoursLogged, onTrack, behind, onLeave},
  //          members:[{id, name, role, hue, today, week, target, weekTarget,
  //          status:'logging'|'closed'|'partial'|'missing'|'leave', lastClose, initial}] }
  ['GET', '/api/dashboard/team', (_b, _f, path) => ok(__buildTeamDashboard(paramOf(path, 'range') || 'today'))],

  // Onboarding-connections (NO EP yet — mock only; see OQ-F3)
  ['GET', '/api/auth/connections', () => ok({ ...CONNECTIONS })],

  // ─── feat/frontend-allpages mocks ─────────────────────────────────────────
  // All shapes traced to the prototype's literals; full per-page lists are
  // built up incrementally as each page lands. These skeletons are enough to
  // make every namespace return *something* so the dev server doesn't blow up.

  // EP-15 — Management org metrics (range param)
  ['GET', '/api/dashboard/org', (_b, _f, path) => ok(__buildOrgDashboard(paramOf(path, 'range') || 'week'))],

  // EP-08 extended — multi-day history (OQ-AP-06)
  ['GET', '/api/history', (_b, _f, path) => ok(__buildHistory(paramOf(path, 'from'), paramOf(path, 'to')))],

  // OQ-AP-08 — team member detail
  ['GET', '/api/team/members/:id', (_b, id) => ok(__buildMemberDetail(parseInt(id, 10) || 1))],

  // EP-16 / EP-17 / EP-18 — Operations
  ['GET',  '/api/ops/compliance', (_b, _f, path) => ok(__buildCompliance(paramOf(path, 'week'))) ],
  ['POST', '/api/ops/run-check',  (body)         => ok({ runId: `r-${Date.now().toString(36)}`, status: 'sent', emailed: (body?.recipientIds || []).length || 8, by: SESSION_USER?.name || 'ops' })],
  ['GET',  '/api/ops/reminders',  (_b, _f, path) => ok(__buildReminders(paramOf(path, 'filter'))) ],

  // EP-21 — Leave + holidays
  ['GET',  '/api/leave', (_b, _f, path) => ok(__buildLeave(paramOf(path, 'month'))) ],
  ['POST', '/api/leave', (body) => ok({ ok: true, leave: { id: Date.now(), ...body } })],

  // EP-19 — Admin users
  ['GET',  '/api/admin/users', () => ok({ users: __USERS, roleCounts: __roleCounts(), statusCounts: __statusCounts() })],
  ['POST', '/api/admin/users', (body) => ok({ user: { id: Date.now(), status: 'invited', ...body } })],
  ['PUT',  '/api/admin/users/:id', (body, id) => ok({ user: { id: parseInt(id, 10), ...body } })],

  // EP-20 — Admin projects
  ['GET',  '/api/admin/projects', () => ok({ projects: __ADMIN_PROJECTS })],
  ['POST', '/api/admin/projects', (body) => ok({ project: { id: Date.now(), status: 'ok', tasks: 0, ...body } })],
  ['POST', '/api/admin/projects/test', (body) => ok({ ok: !!body?.jiraKey, message: body?.jiraKey ? `Connected to ${body.jiraKey}` : 'Provide a Jira key' })],

  // EP-22 — Admin settings (global)
  ['GET',  '/api/admin/settings', () => ok({ settings: __ADMIN_SETTINGS })],
  ['PUT',  '/api/admin/settings', (body) => ok({ settings: { ...__ADMIN_SETTINGS, ...body } })],

  // OQ-AP-04 — User-scope settings
  ['GET',  '/api/me/settings', () => ok({ ...__ME_SETTINGS })],
  ['PUT',  '/api/me/settings', (body) => ok({ ...__ME_SETTINGS, ...body })],

  // OQ-AP-13 — Integrations (section-scoped EP-22)
  ['GET',  '/api/admin/integrations', () => ok({ integrations: __INTEGRATIONS })],
  ['PUT',  '/api/admin/integrations', (body) => ok({ integrations: { ...__INTEGRATIONS, [body?.section]: { ...(__INTEGRATIONS[body?.section] || {}), ...(body?.body || {}) } } })],
];

// =============================================================================
// feat/frontend-allpages mock catalogue — extracted from the prototype HTMLs
// =============================================================================

const __USERS = [
  { id: 1, name: 'Yogesh Mohite',  email: 'yogesh@iksula.com',  role: 'employee',   team: 'PIMCore',        status: 'active',   conn: { jira: 'ok',  google: 'ok'  }, joined: '2024-08-12', initial: 'Y', hue: '#2563EB', me: true  },
  { id: 2, name: 'Anuja Patil',     email: 'anuja@iksula.com',    role: 'pm_lead',    team: 'PIMCore',        status: 'active',   conn: { jira: 'ok',  google: 'ok'  }, joined: '2023-04-02', initial: 'A', hue: '#10B981' },
  { id: 3, name: 'Riya Shah',       email: 'riya@iksula.com',     role: 'employee',   team: 'Modern Electronics', status: 'active', conn: { jira: 'ok',  google: 'ok'  }, joined: '2024-11-01', initial: 'R', hue: '#F59E0B' },
  { id: 4, name: 'Dev Kapoor',      email: 'dev@iksula.com',      role: 'employee',   team: 'CUMI',           status: 'active',   conn: { jira: 'ok',  google: 'miss'}, joined: '2025-01-22', initial: 'D', hue: '#8B5CF6' },
  { id: 5, name: 'Sneha Verma',     email: 'sneha@iksula.com',    role: 'management', team: 'Leadership',     status: 'active',   conn: { jira: 'miss',google: 'ok'  }, joined: '2022-02-14', initial: 'S', hue: '#DC2626' },
  { id: 6, name: 'Priya Iyer',      email: 'priya@iksula.com',    role: 'operations', team: 'Ops',            status: 'active',   conn: { jira: 'ok',  google: 'ok'  }, joined: '2023-09-05', initial: 'P', hue: '#0EA5E9' },
  { id: 7, name: 'Karan Bansal',    email: 'karan@iksula.com',    role: 'employee',   team: 'PIMCore',        status: 'invited',  conn: { jira: 'miss',google: 'miss'}, joined: '2026-05-18', initial: 'K', hue: '#64748B' },
  { id: 8, name: 'Maya Iyer',       email: 'maya@iksula.com',     role: 'employee',   team: 'PIMCore',        status: 'disabled', conn: { jira: 'miss',google: 'miss'}, joined: '2023-06-09', initial: 'M', hue: '#64748B' },
];
function __roleCounts()   { const c = {}; __USERS.forEach(u => { c[u.role]   = (c[u.role]   || 0) + 1; }); return c; }
function __statusCounts() { const c = {}; __USERS.forEach(u => { c[u.status] = (c[u.status] || 0) + 1; }); return c; }

const __ADMIN_PROJECTS = [
  { id: 1, name: 'SiteOne PIMCore',     initial: 'S', color: '#2563EB', kind: 'CLIENT',   key: 'PIM',    desc: 'Catalogue + supplier import', status: 'ok',   tasks: 312, lastSync: '2026-05-22T18:30:00+0530' },
  { id: 2, name: 'Modern Electronics',  initial: 'M', color: '#10B981', kind: 'CLIENT',   key: 'ML',     desc: 'Storefront + cart',           status: 'ok',   tasks: 188, lastSync: '2026-05-22T18:30:00+0530' },
  { id: 3, name: 'CUMI Pimcore',        initial: 'C', color: '#F59E0B', kind: 'CLIENT',   key: 'CUMI',   desc: 'Master data + workflows',     status: 'fail', tasks: 0,   lastSync: '2026-05-12T12:00:00+0530' },
  { id: 4, name: 'Internal / Meetings', initial: 'I', color: '#8B5CF6', kind: 'INTERNAL', key: 'INTERNAL', desc: 'Standups, grooming',        status: 'ok',   tasks: 4,   lastSync: '2026-05-22T18:30:00+0530' },
  { id: 5, name: 'Bench',               initial: 'B', color: '#64748B', kind: 'INTERNAL', key: 'BENCH',  desc: 'Bench / learning',            status: 'ok',   tasks: 1,   lastSync: '2026-05-22T18:30:00+0530' },
];

const __ADMIN_SETTINGS = {
  workTarget: 40, meetingTicket: 'INTERNAL-1',
  reminderCadence: 'eod',
  fri: { hour: 13, dayOfWeek: 5 },
  mon: { hour: 13, dayOfWeek: 1 },
};

const __ME_SETTINGS = {
  profile:     { name: 'Yogesh Mohite', email: 'yogesh@iksula.com', role: 'employee', team: 'PIMCore' },
  reminders:   { cadence: 'eod', quietStart: '20:00', quietEnd: '09:00' },
  appearance:  { density: 'comfortable', fontSize: 'medium', dark: false, primaryColor: '#DC2626' },
  connections: { jira: { status: 'connected', expiresAt: '2026-08-22' }, google: { status: 'connected', expiresAt: '2026-08-22' } },
};

const __INTEGRATIONS = {
  jira:   { workspaceUrl: 'https://iksula.atlassian.net', scopes: ['read:jira-work', 'write:jira-work'], health: 'ok',  error: null },
  google: { spreadsheetId: '1aBc…copy', scopes: ['sheets', 'gmail.compose'], health: 'ok' },
  email:  { senderDisplayName: 'AutoClock @ Iksula', defaultCadence: 'eod' },
  reader: { enabled: false, email: '', health: 'idle' },
};

// History — 14 days of synthetic per-user data
function __buildHistory(_from, _to) {
  const days = [];
  const NOW  = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(NOW); d.setDate(NOW.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const wd  = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
    const hrs = (i % 7 === 6 || i % 7 === 5) ? 0 : 360 + Math.round(Math.random() * 200);  // weekend = 0
    days.push({
      key: iso, wd, day: d.getDate(),
      hrs,
      sync: hrs === 0 ? 'skipped' : (i === 0 ? 'partial' : 'synced'),
      tickets: hrs === 0 ? [] : [
        { proj: 'PIM',      key: 'PIM-3066', title: 'Reviewed PR for supplier import',         desc: 'Comments + approve', mins: 60, slots: 1 },
        { proj: 'PIM',      key: 'PIM-3068', title: 'SKU variant mapping — test coverage',     desc: '15 tests, 2 edge cases flagged', mins: 90, slots: 1 },
        { proj: 'INTERNAL', key: 'OPS-412',  title: 'QA standup',                              desc: 'Flagged catalog-import regression', mins: 30, slots: 1 },
      ],
    });
  }
  return { days };
}

// Org dashboard — varies a tiny bit by range
function __buildOrgDashboard(range) {
  const teams = [
    { id: 1, name: 'PIMCore',            lead: 'Anuja Patil',    color: '#2563EB', people: 12, weekHrs: 380, weekTarget: 480, util: 79, sparkData: [70, 72, 68, 80, 76, 82, 79] },
    { id: 2, name: 'Modern Electronics', lead: 'Aman Singh',     color: '#10B981', people:  8, weekHrs: 280, weekTarget: 320, util: 88, sparkData: [85, 89, 90, 86, 90, 88, 88] },
    { id: 3, name: 'CUMI',               lead: 'Vikram Reddy',   color: '#F59E0B', people:  6, weekHrs: 200, weekTarget: 240, util: 83, sparkData: [80, 82, 80, 83, 85, 83, 83] },
    { id: 4, name: 'Internal/Ops',       lead: 'Priya Iyer',     color: '#8B5CF6', people:  4, weekHrs: 130, weekTarget: 160, util: 81, sparkData: [78, 80, 81, 82, 81, 81, 81] },
  ];
  const topProjects = [
    { id: 1, name: 'SiteOne PIMCore', key: 'PIM',  color: '#2563EB', weekHrs: 320, util: 82 },
    { id: 2, name: 'Modern Electronics', key: 'ML', color: '#10B981', weekHrs: 220, util: 88 },
    { id: 3, name: 'CUMI Pimcore', key: 'CUMI', color: '#F59E0B', weekHrs: 160, util: 80 },
  ];
  return {
    range,
    kpis: { peopleLoggingToday: 24, orgUtilization: 83, weekHrs: 990, projectsActive: 5 },
    donut: { logged: 990, leave: 80, untracked: 140, holiday: 60 },
    trend8w: [780, 820, 810, 870, 905, 950, 980, 990].map((val, i) => ({ week: `W${14 + i}`, val })),
    teams,
    topProjects,
  };
}

// Team-member detail — 14 days
function __buildMemberDetail(memberId) {
  const member = __USERS.find(u => u.id === memberId) || __USERS[0];
  const dailyMins = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const wd  = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const mins = isWeekend ? 0 : 420 + Math.round(Math.random() * 120);
    dailyMins.push({ date: iso, wd, day: d.getDate(), mins, sync: mins === 0 ? 'zero' : (i === 0 ? 'partial' : 'synced') });
  }
  const weekLogged = dailyMins.slice(-7).reduce((a, d) => a + d.mins, 0);
  return {
    member: { id: member.id, name: member.name, email: member.email, role: member.role, team: member.team, hue: member.hue || '#2563EB', presence: 'online' },
    kpis: [
      { label: 'Logged this week', value: `${(weekLogged/60).toFixed(1)}h`, delta: '+2.4h' },
      { label: 'Target',            value: '40h', delta: weekLogged < 32*60 ? 'behind' : 'on track' },
      { label: 'Avg slot length',   value: '52m', delta: '+3m' },
      { label: 'Last close',        value: 'today', delta: 'on time' },
    ],
    dailyMins,
    days: dailyMins.filter(d => d.mins > 0).slice(-7).map(d => ({
      date: d.date, wd: d.wd, total: d.mins,
      tickets: [
        { proj: 'PIM', key: 'PIM-3066', title: 'Reviewed PR for supplier import',       mins: 60, slots: 1, sync: d.sync },
        { proj: 'PIM', key: 'PIM-3068', title: 'SKU variant mapping — test coverage',    mins: 90, slots: 1, sync: d.sync },
      ],
    })),
    deltaVsTeam: 4,
    status: weekLogged < 32*60 ? 'behind' : 'ontrack',
  };
}

// Compliance — one row per employee
function __buildCompliance(week) {
  const people = __USERS.filter(u => u.role === 'employee' || u.role === 'pm_lead').map((u, i) => {
    const logged = 30 + Math.round(Math.random() * 12);
    const target = 40;
    return { id: u.id, name: u.name, role: u.role, team: u.team, email: u.email, weekTarget: target, logged, gap: Math.max(0, target - logged), leave: 0, status: logged < target * 0.8 ? 'bad' : (logged < target ? 'short' : 'ok'), hue: u.hue, initial: u.initial };
  });
  const peopleUnder    = people.filter(p => p.status === 'bad').length;
  const peopleOk       = people.filter(p => p.status === 'ok').length;
  const peopleOnLeave  = 0;
  const weekHrs        = people.reduce((a, p) => a + p.logged, 0);
  return {
    week: week || 'W21',
    windowStart: '2026-05-18', windowEnd: '2026-05-22',
    target: 40,
    stats: { peopleUnder, peopleOk, peopleOnLeave, weekHrsAggregate: weekHrs },
    people,
  };
}

// Team dashboard — extended shape used by P08 (Team Dashboard) and P09 detail.
// Synthesises per-member today/week/target/status/lastClose from __USERS so the
// UI design fidelity is preserved without the backend implementing OQ-AP-07 yet.
function __buildTeamDashboard(range) {
  // PM/lead view: include the pm_lead viewer + all employee teammates. Exclude
  // management/operations/admin (they're cross-team viewers, not members).
  const TEAM_NAME = 'SiteOne PIM Squad';
  const TEAM_COLOR = '#2563EB';
  const ranks = __USERS.filter(u => u.role === 'employee' || u.role === 'pm_lead');
  // Deterministic-ish synth driven by user.id so screenshots are stable per range.
  // Five statuses cycle: 0=logging, 1=closed, 2=closed, 3=missing, 4=partial,
  // 5=leave (rare), 6=missing.
  const STATUSES = ['logging', 'closed', 'closed', 'missing', 'partial', 'leave', 'missing', 'closed'];
  const TARGETS_TODAY = 480;       // 8h × 60
  const TARGETS_WEEK  = 2400;      // 40h × 60
  const members = ranks.map((u, i) => {
    const status = STATUSES[i % STATUSES.length];
    // today mins by status
    let today = 0;
    if (status === 'logging') today = 330;
    else if (status === 'closed')  today = 460 + (i % 3) * 25;
    else if (status === 'partial') today = 210;
    else if (status === 'missing') today = 0;
    else if (status === 'leave')   today = 0;
    // week mins — closer to target for closed/logging, behind for missing/partial.
    let week = TARGETS_WEEK - (status === 'missing' ? 1020 : status === 'partial' ? 420 : status === 'leave' ? 1920 : 150 + (i % 4) * 60);
    if (range === 'today')  week = Math.round(week * 0.7);
    if (range === 'sprint') week = Math.round(week * 2.1);
    if (range === 'month')  week = Math.round(week * 4.3);
    return {
      id: u.id, name: u.name, role: 'QA Engineer',
      hue: u.hue || '#2563EB', initial: (u.initial || u.name[0]).toUpperCase(),
      today, week, target: TARGETS_TODAY, weekTarget: TARGETS_WEEK,
      status, lastClose: status === 'closed' ? 'today, 5:42 PM' : status === 'logging' ? 'today, 11:00 AM' : status === 'partial' ? 'today, 1:15 PM' : status === 'leave' ? 'Mon, 6:00 PM' : 'yesterday, 6:00 PM',
    };
  });
  const teamSize  = members.filter(m => m.status !== 'leave').length;
  const onLeave   = members.filter(m => m.status === 'leave').length;
  const onTrack   = members.filter(m => m.status === 'closed' || m.status === 'logging').length;
  const behind    = members.filter(m => m.status === 'partial' || m.status === 'missing').length;
  const hoursLogged = members.reduce((a, m) => a + m.today, 0);
  return {
    team: { id: 1, name: TEAM_NAME, color: TEAM_COLOR },
    range,
    kpis: { hoursLogged, onTrack, behind, onLeave, teamSize },
    members,
  };
}

// Reminders — past runs
function __buildReminders(_filter) {
  return {
    runs: [
      { id: 'r1', date: '2026-05-22', when: 'Today 13:00', type: 'friday', label: 'Friday check · W21', emailed: 8, complied: 5, by: 'auto', auto: true, status: 'live', summary: '8 people emailed at Friday 1pm. 5 closed within 24h.', recipients: [
        { id: 1, name: 'Karan Bansal', team: 'PIMCore', email: 'karan@iksula.com', gap: 8, status: 'bad' },
        { id: 2, name: 'Maya Iyer',    team: 'PIMCore', email: 'maya@iksula.com',  gap: 6, status: 'bad' },
        { id: 3, name: 'Dev Kapoor',   team: 'CUMI',    email: 'dev@iksula.com',   gap: 4, status: 'ok'  },
      ] },
      { id: 'r2', date: '2026-05-19', when: 'Mon 13:00', type: 'monday', label: 'Monday check · W21', emailed: 5, complied: 5, by: 'auto', auto: true, status: 'closed', summary: '5 reminded; all complied by EOD.', recipients: [] },
      { id: 'r3', date: '2026-05-15', when: 'Fri 13:00', type: 'friday', label: 'Friday check · W20', emailed: 9, complied: 7, by: 'auto', auto: true, status: 'closed', summary: '9 emailed; 7 closed within 24h.', recipients: [] },
    ],
  };
}

// Leave + holidays
function __buildLeave(month) {
  return {
    month: month || '2026-05',
    holidays: [
      { date: '2026-05-01', name: 'Labour Day' },
      { date: '2026-05-26', name: 'Buddha Purnima' },
    ],
    leave: [
      { id: 1, person: 'Karan Bansal', pid: 7, team: 'PIMCore',           initial: 'K', start: '2026-05-20', end: '2026-05-22', reason: 'Family event',   hue: '#64748B', status: 'approved' },
      { id: 2, person: 'Riya Shah',    pid: 3, team: 'Modern Electronics',initial: 'R', start: '2026-05-23', end: '2026-05-23', reason: 'Personal',       hue: '#F59E0B', status: 'approved' },
      { id: 3, person: 'Dev Kapoor',   pid: 4, team: 'CUMI',              initial: 'D', start: '2026-05-28', end: '2026-05-30', reason: 'Wedding',        hue: '#8B5CF6', status: 'approved' },
    ],
    summary: { peopleOnLeaveThisMonth: 3, daysTotal: 5 },
  };
}

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
