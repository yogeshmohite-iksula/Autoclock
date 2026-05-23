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
