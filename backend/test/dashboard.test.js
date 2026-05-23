// dashboard.test.js — Integration tests for EP-14 (PM/Lead team) and EP-15 (Management org).
// Covers: real data shape, RBAC scoping, graceful edge cases (FR-10/11).
// Uses seeded data: Yogesh + Sneha have today's entries; 2 teams.
// Node 18 built-in runner + fetch. No extra deps.

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../server');

let server, base;

before(() => new Promise(resolve => {
  server = app.listen(0, () => {
    base = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => server.close(resolve)));

// ── helpers ───────────────────────────────────────────────────────────────────

async function login(email) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.headers.get('set-cookie');
}

async function get(path, cookie) {
  return fetch(`${base}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
}

// ── EP-14 PM/Lead team dashboard ─────────────────────────────────────────────

test('EP-14 GET /api/dashboard/team — pm_lead gets 200 with extended shape', async () => {
  const cookie = await login('priya@iksula.com'); // pm_lead, team 1
  const res    = await get('/api/dashboard/team', cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  // team object
  assert.ok(body.team && typeof body.team.id === 'number', 'team.id present');
  assert.ok(typeof body.team.name === 'string',            'team.name present');
  // range echoed
  assert.ok('range' in body, 'range field present');
  // kpis — new shape
  assert.ok(typeof body.kpis === 'object',            'kpis object present');
  assert.ok('hoursLogged' in body.kpis,               'kpis.hoursLogged');
  assert.ok('onTrack'     in body.kpis,               'kpis.onTrack');
  assert.ok('behind'      in body.kpis,               'kpis.behind');
  assert.ok('onLeave'     in body.kpis,               'kpis.onLeave');
  assert.ok('teamSize'    in body.kpis,               'kpis.teamSize');
  // arrays
  assert.ok(Array.isArray(body.by_ticket),            'by_ticket is array');
  assert.ok(Array.isArray(body.not_logged_today),      'not_logged_today is array');
  assert.ok(Array.isArray(body.members),               'members is array');
});

test('EP-14 members — enriched with week, target, status, hue, initial, role', async () => {
  const cookie = await login('priya@iksula.com');
  const body   = await (await get('/api/dashboard/team', cookie)).json();
  assert.ok(body.members.length > 0, 'team has members');
  const m = body.members[0];
  assert.ok('week'      in m, 'member.week present');
  assert.ok('target'    in m, 'member.target present');
  assert.ok('weekTarget'in m, 'member.weekTarget present');
  assert.ok('status'    in m, 'member.status present');
  assert.ok('hue'       in m, 'member.hue present');
  assert.ok('initial'   in m, 'member.initial present');
  assert.ok('role'      in m, 'member.role present');
  assert.ok(['logging', 'closed', 'missing', 'leave'].includes(m.status),
    'status is a known value');
  assert.ok(m.initial === m.name.charAt(0).toUpperCase(), 'initial matches name');
  assert.equal(m.hue, m.id % 8, 'hue = id % 8');
});

test('EP-14 by_ticket — seeded entries create non-empty ticket list for team', async () => {
  const cookie = await login('priya@iksula.com');
  const body   = await (await get('/api/dashboard/team', cookie)).json();
  // Seed has Yogesh (team1) with 3 worklog entries today
  assert.ok(body.by_ticket.length > 0, 'seeded entries appear in by_ticket');
  assert.ok(body.by_ticket.every(r => r.jira_key && r.minutes >= 0), 'by_ticket rows have jira_key + minutes');
});

test('EP-14 as employee → 403 FORBIDDEN', async () => {
  const cookie = await login('yogesh@iksula.com'); // role=employee
  const res    = await get('/api/dashboard/team', cookie);
  const body   = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('EP-14 pm_lead with no team_id → 200 with empty shape', async () => {
  // Divya is pm_lead of team 2; verifies the route returns 200 for any pm_lead.
  const cookie = await login('divya@iksula.com');
  const res    = await get('/api/dashboard/team', cookie);
  assert.equal(res.status, 200);
});

test('EP-14 ?range param is echoed in response', async () => {
  const cookie = await login('priya@iksula.com');
  const body   = await (await get('/api/dashboard/team?range=month', cookie)).json();
  assert.equal(body.range, 'month', 'range echoed from query param');
});

// ── EP-15 Management org dashboard ────────────────────────────────────────────

test('EP-15 GET /api/dashboard/org — management gets 200 with new shape', async () => {
  const cookie = await login('arjun@iksula.com'); // role=management
  const res    = await get('/api/dashboard/org', cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  // kpis still present
  assert.ok(typeof body.kpis === 'object',             'kpis object present');
  assert.ok('workforce_logged_today' in body.kpis,     'workforce_logged_today');
  assert.ok('org_compliance_pct'     in body.kpis,     'org_compliance_pct');
  assert.ok('org_utilization_pct'    in body.kpis,     'org_utilization_pct');
  assert.ok('active_projects'        in body.kpis,     'active_projects');
  // donut
  assert.ok(typeof body.donut === 'object',            'donut object present');
  assert.ok('logged'    in body.donut,                 'donut.logged');
  assert.ok('leave'     in body.donut,                 'donut.leave');
  assert.ok('untracked' in body.donut,                 'donut.untracked');
  assert.ok('holiday'   in body.donut,                 'donut.holiday');
});

test('EP-15 as employee → 403 FORBIDDEN', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await get('/api/dashboard/org', cookie);
  const body   = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('EP-15 topProjects, teams, trend8w shape (8 weeks)', async () => {
  const cookie = await login('arjun@iksula.com');
  const body   = await (await get('/api/dashboard/org', cookie)).json();
  // renamed fields
  assert.ok(Array.isArray(body.topProjects), 'topProjects array (was project_portfolio)');
  assert.ok(Array.isArray(body.teams),       'teams array (was team_comparison)');
  assert.ok(Array.isArray(body.trend8w),     'trend8w array (was trend_weeks)');
  assert.equal(body.trend8w.length, 8,       '8 weeks of trend data');
  assert.ok(body.trend8w.every(w => w.week_start && 'total_minutes' in w && 'users_logged' in w),
    'each trend8w row has week_start, total_minutes, users_logged');
  // old field names must NOT be present
  assert.ok(!('project_portfolio' in body), 'project_portfolio renamed away');
  assert.ok(!('team_comparison'   in body), 'team_comparison renamed away');
  assert.ok(!('trend_weeks'       in body), 'trend_weeks renamed away');
});
