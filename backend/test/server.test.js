// server.test.js — Integration tests for the Express foundation.
// Proves: server boots, health check passes, RBAC rejects wrong roles,
// errors return the consistent { error: { code, message } } shape.
// Uses Node 18 built-in test runner + built-in fetch. No extra deps.

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../server');

let server;
let base;

before(() => new Promise(resolve => {
  server = app.listen(0, () => {
    base = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => server.close(resolve)));

// ── helpers ───────────────────────────────────────────────────────────────

async function login(email) {
  const res = await fetch(`${base}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  });
  // Return the Set-Cookie header so callers can attach it to later requests.
  return res.headers.get('set-cookie');
}

async function get(path, cookie) {
  return fetch(`${base}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

async function post(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body:    JSON.stringify(body),
  });
}

// ── tests ─────────────────────────────────────────────────────────────────

test('GET /api/health → 200 { ok: true }', async () => {
  const res  = await get('/api/health');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.ts, 'ts timestamp present');
});

test('unauthenticated request → 401 UNAUTHENTICATED', async () => {
  const res  = await get('/api/entries');
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.error.code, 'UNAUTHENTICATED');
  assert.ok(body.error.message);
});

test('wrong role (employee → admin route) → 403 FORBIDDEN', async () => {
  // yogesh@iksula.com is seeded as role=employee
  const cookie = await login('yogesh@iksula.com');
  assert.ok(cookie, 'login must succeed');

  const res  = await get('/api/admin/users', cookie);
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
  assert.ok(body.error.message);
});

test('validation error → 400 with consistent error shape', async () => {
  const cookie = await login('yogesh@iksula.com');

  const res  = await post('/api/entries', {
    project_id:       1,
    jira_task_id:     1,
    description:      'test',
    duration_minutes: 0,      // zero duration must be rejected (DevDoc §4.4)
    slot_start:       '10:00',
    slot_end:         '10:30',
    work_date:        '2026-05-22',
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.ok(body.error?.code,    'error.code present');
  assert.ok(body.error?.message, 'error.message present');
});

test('unknown /api/* route → 404 NOT_FOUND with error shape', async () => {
  const res  = await get('/api/this-route-does-not-exist');
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.ok(body.error.message);
});
