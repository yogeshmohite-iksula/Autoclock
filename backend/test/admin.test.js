// admin.test.js — Integration tests for EP-19/20/21/22 admin endpoints.
// Covers: B4 (PUT /api/admin/projects/:id) and B5 (section-scoped settings PUT).
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

async function put(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function post(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

// ── EP-20 PUT /api/admin/projects/:id (B4) ────────────────────────────────────

test('EP-20 GET /api/admin/projects returns projects array', async () => {
  const cookie = await login('tejas@iksula.com'); // admin
  const res  = await get('/api/admin/projects', cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.projects), 'projects is array');
  assert.ok(body.projects.length > 0, 'at least one project seeded');
});

test('EP-20 PUT /api/admin/projects/:id updates name', async () => {
  const cookie = await login('tejas@iksula.com');
  // Get a real project id first
  const { projects } = await (await get('/api/admin/projects', cookie)).json();
  const proj = projects[0];

  const originalName = proj.name;
  const newName = `${originalName} (edited)`;

  const res  = await put(`/api/admin/projects/${proj.id}`, { name: newName }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);

  // Verify the change persisted
  const { projects: updated } = await (await get('/api/admin/projects', cookie)).json();
  const found = updated.find(p => p.id === proj.id);
  assert.equal(found.name, newName);

  // Restore original name
  await put(`/api/admin/projects/${proj.id}`, { name: originalName }, cookie);
});

test('EP-20 PUT /api/admin/projects/:id can toggle is_active', async () => {
  const cookie = await login('tejas@iksula.com');
  const { projects } = await (await get('/api/admin/projects', cookie)).json();
  const proj = projects[0];

  const res  = await put(`/api/admin/projects/${proj.id}`, { is_active: 0 }, cookie);
  assert.equal(res.status, 200);

  const { projects: updated } = await (await get('/api/admin/projects', cookie)).json();
  const found = updated.find(p => p.id === proj.id);
  assert.equal(found.is_active, 0);

  // Restore
  await put(`/api/admin/projects/${proj.id}`, { is_active: 1 }, cookie);
});

test('EP-20 PUT /api/admin/projects/9999 → 404 NOT_FOUND', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/projects/9999', { name: 'ghost' }, cookie);
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('EP-20 PUT /api/admin/projects/:id as employee → 403 FORBIDDEN', async () => {
  const cookie = await login('yogesh@iksula.com'); // employee
  const res  = await put('/api/admin/projects/1', { name: 'hack' }, cookie);
  assert.equal(res.status, 403);
});

// ── EP-22 section-scoped settings PUT (B5) ────────────────────────────────────

test('EP-22 PUT /api/admin/settings with {section,body} stores namespaced keys', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/settings', {
    section: 'jira',
    body: { baseUrl: 'https://iksula.atlassian.net', enabled: 'true' },
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.settings, 'settings returned');
  assert.equal(body.settings['jira.baseUrl'], 'https://iksula.atlassian.net');
  assert.equal(body.settings['jira.enabled'], 'true');
  // literal "section" key must NOT be written
  assert.ok(!('section' in body.settings), 'no literal "section" key written');
});

test('EP-22 PUT /api/admin/settings section=reader stores reader.* keys', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/settings', {
    section: 'reader',
    body: { enabled: 'false', email: 'reader@iksula.com' },
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.settings['reader.enabled'], 'false');
  assert.equal(body.settings['reader.email'], 'reader@iksula.com');
});

test('EP-22 PUT /api/admin/settings flat map still works (backwards compat)', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/settings', { weekly_target_hours: '40' }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.settings['weekly_target_hours'], '40');
});

test('EP-22 PUT /api/admin/settings invalid section → 400 BAD_REQUEST', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/settings', { section: 'slack', body: {} }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

test('EP-22 PUT /api/admin/settings section without body → 400 BAD_REQUEST', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await put('/api/admin/settings', { section: 'jira' }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

// ── EP-19 server-side filtering (B6) ─────────────────────────────────────────

test('EP-19 GET /api/admin/users no params → active users only', async () => {
  const cookie = await login('tejas@iksula.com');
  const body   = await (await get('/api/admin/users', cookie)).json();
  assert.ok(Array.isArray(body.users), 'users is array');
  assert.ok(body.users.length > 0,    'at least one active user');
  assert.ok(body.users.every(u => u.is_active === 1), 'all returned users are active');
});

test('EP-19 GET /api/admin/users?status=all → includes inactive users', async () => {
  const { db } = require('../db');
  db.prepare("UPDATE users SET is_active=0 WHERE email='sneha@iksula.com'").run();

  const cookie = await login('tejas@iksula.com');
  const all    = await (await get('/api/admin/users?status=all', cookie)).json();
  const active = await (await get('/api/admin/users?status=active', cookie)).json();
  assert.ok(all.users.length > active.users.length, 'status=all returns more rows than active');
  assert.ok(all.users.some(u => u.is_active === 0), 'inactive user present in status=all');

  db.prepare("UPDATE users SET is_active=1 WHERE email='sneha@iksula.com'").run();
});

test('EP-19 GET /api/admin/users?filter=yogesh → name match', async () => {
  const cookie = await login('tejas@iksula.com');
  const body   = await (await get('/api/admin/users?filter=yogesh', cookie)).json();
  assert.ok(body.users.length > 0, 'at least one result');
  assert.ok(body.users.every(u => u.name.toLowerCase().includes('yogesh') || u.email.toLowerCase().includes('yogesh')), 'all results match filter');
});

test('EP-19 GET /api/admin/users?filter=zzznomatch → empty array', async () => {
  const cookie = await login('tejas@iksula.com');
  const body   = await (await get('/api/admin/users?filter=zzznomatch', cookie)).json();
  assert.equal(body.users.length, 0, 'no match returns empty array');
});

// ── EP-20 POST /api/admin/projects/test (B7) ──────────────────────────────────

test('EP-20 POST /api/admin/projects/test without env → {ok:false, message}', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await post('/api/admin/projects/test', { jira_project_key: 'PIM' }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, false);
  assert.ok(body.message, 'message present');
});

test('EP-20 POST /api/admin/projects/test missing jira_project_key → 400', async () => {
  const cookie = await login('tejas@iksula.com');
  const res  = await post('/api/admin/projects/test', {}, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

// ── EP-21 leave POST full row (B9) ────────────────────────────────────────────

test('EP-21 POST /api/leave returns full leave row with status field', async () => {
  const cookie = await login('omkar@iksula.com'); // operations
  const res  = await post('/api/leave', {
    user_id:    3,
    leave_date: '2099-06-01',
    leave_type: 'pto',
    hours:      8,
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.leave,                      'leave object present');
  assert.ok(body.leave.id,                   'leave.id present');
  assert.equal(body.leave.user_id, 3,        'leave.user_id matches');
  assert.equal(body.leave.leave_date, '2099-06-01');
  assert.equal(body.leave.leave_type, 'pto');
  assert.equal(body.leave.hours, 8);
  assert.equal(body.leave.status, 'pending', 'status field present');

  // Cleanup
  const { db } = require('../db');
  db.prepare("DELETE FROM leave_days WHERE user_id=3 AND leave_date='2099-06-01'").run();
});
