// entries.test.js — Integration tests for EP-06..EP-11.
// Covers: CRUD lifecycle, dependent dropdowns, duration formats,
// >24h blocking, overlap warnings, IST timezone, FK validation.
// Node 18 built-in runner + fetch. No extra deps.

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../server');

let server, base;

before(() => new Promise(resolve => {
  // Purge entries accumulated from previous test runs on the far-future test dates.
  const { db } = require('../db');
  db.prepare(
    "DELETE FROM worklog_entries WHERE work_date IN ('2099-01-15','2099-01-16','2099-01-17','2099-01-18')"
  ).run();

  server = app.listen(0, () => {
    base = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise(resolve => server.close(resolve)));

// ── helpers ───────────────────────────────────────────────────────────────

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

async function post(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function put(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function del(path, cookie) {
  return fetch(`${base}${path}`, { method: 'DELETE', headers: cookie ? { Cookie: cookie } : {} });
}

// Discover real IDs from seed data via the API so tests are not brittle.
async function getFirstProject(cookie) {
  const res  = await get('/api/projects', cookie);
  const body = await res.json();
  return body.projects[0]; // { id, name, jira_project_key }
}

async function getFirstTask(projectId, cookie) {
  const res  = await get(`/api/projects/${projectId}/tasks`, cookie);
  const body = await res.json();
  return body.tasks[0]; // { id, jira_key, summary }
}

// Use far-future dates so tests never collide with seed data or each other.
const DATE_CRUD    = '2099-01-15';
const DATE_24H     = '2099-01-16';
const DATE_OVERLAP = '2099-01-17';
const DATE_FORMATS = '2099-01-18';

// ── EP-06 / EP-07 dropdowns ───────────────────────────────────────────────

test('EP-06 GET /api/projects — returns project list', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await get('/api/projects', cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.projects));
  assert.ok(body.projects.length >= 5, 'at least 5 seeded projects');
  assert.ok(body.projects[0].id);
  assert.ok(body.projects[0].name);
  assert.ok(body.projects[0].jira_project_key);
});

test('EP-07 GET /api/projects/:id/tasks — tasks scoped to project', async () => {
  const cookie    = await login('yogesh@iksula.com');
  const project   = await getFirstProject(cookie);
  const res       = await get(`/api/projects/${project.id}/tasks`, cookie);
  const body      = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(body.tasks));
  assert.ok(body.tasks.length >= 1, 'seeded project has at least 1 task');
  assert.ok(body.tasks[0].jira_key.startsWith(project.jira_project_key),
    `task key should start with ${project.jira_project_key}`);
});

test('EP-07 unknown project → 404 NOT_FOUND', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await get('/api/projects/99999/tasks', cookie);
  const body   = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

// ── EP-09 / EP-08 / EP-10 / EP-11 CRUD lifecycle ─────────────────────────

test('EP-09 POST — creates entry; EP-08 GET — lists it', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  const createRes  = await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'wrote tc', duration_minutes: 60,
    slot_start: '09:00', slot_end: '10:00', work_date: DATE_CRUD,
  }, cookie);
  const createBody = await createRes.json();
  assert.equal(createRes.status, 201, 'create returns 201');
  assert.ok(createBody.entry.id);
  assert.equal(createBody.entry.duration_minutes, 60);
  assert.equal(createBody.entry.description, 'Wrote test cases', 'tidy() capitalised + expanded shorthand');
  assert.equal(createBody.entry.jira_key, task.jira_key, 'enriched jira_key present');
  assert.equal(createBody._tz, 'IST');
  assert.ok(Array.isArray(createBody.warnings));

  // List the day
  const listRes  = await get(`/api/entries?date=${DATE_CRUD}`, cookie);
  const listBody = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listBody._tz, 'IST');
  const found = listBody.entries.find(e => e.id === createBody.entry.id);
  assert.ok(found, 'created entry appears in day list');
});

test('EP-10 PUT — edit updates fields', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  // Create
  const { entry } = await (await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'initial', duration_minutes: 30,
    slot_start: '11:00', slot_end: '11:30', work_date: DATE_CRUD,
  }, cookie)).json();

  // Edit
  const editRes  = await put(`/api/entries/${entry.id}`, { description: 'updated desc', duration_minutes: 45 }, cookie);
  const editBody = await editRes.json();
  assert.equal(editRes.status, 200);
  assert.equal(editBody.entry.duration_minutes, 45);
  assert.equal(editBody.entry.description, 'Updated desc');
  assert.equal(editBody._tz, 'IST');
});

test('EP-11 DELETE — entry is removed; second delete → 404', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  const { entry } = await (await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'to delete', duration_minutes: 15,
    slot_start: '12:00', slot_end: '12:15', work_date: DATE_CRUD,
  }, cookie)).json();

  const del1 = await del(`/api/entries/${entry.id}`, cookie);
  assert.equal(del1.status, 200);
  assert.equal((await del1.json()).ok, true);

  const del2 = await del(`/api/entries/${entry.id}`, cookie);
  assert.equal(del2.status, 404);
});

// ── Duration format parsing ───────────────────────────────────────────────

const durationCases = [
  { label: '"1.5h"',   send: { duration_raw: '1.5h' },        expected: 90 },
  { label: '"90m"',    send: { duration_raw: '90m' },          expected: 90 },
  { label: '"1h30m"',  send: { duration_raw: '1h30m' },        expected: 90 },
  { label: '"90 min"', send: { duration_raw: '90 min' },       expected: 90 },
  { label: '"2 hrs"',  send: { duration_minutes: 2 * 60 },     expected: 120 },
];

for (const { label, send, expected } of durationCases) {
  test(`duration ${label} → ${expected} minutes stored`, async () => {
    const cookie  = await login('yogesh@iksula.com');
    const project = await getFirstProject(cookie);
    const task    = await getFirstTask(project.id, cookie);

    const res  = await post('/api/entries', {
      project_id: project.id, jira_task_id: task.id,
      description: `duration test ${label}`,
      slot_start: '13:00', slot_end: '14:30', work_date: DATE_FORMATS,
      ...send,
    }, cookie);
    const body = await res.json();
    assert.equal(res.status, 201, `${label}: create should succeed`);
    assert.equal(body.entry.duration_minutes, expected, `${label}: stored minutes`);
    // Clean up — delete the entry so accumulated runs never push DATE_FORMATS over 24h.
    await del(`/api/entries/${body.entry.id}`, cookie);
  });
}

// ── Validation rules ──────────────────────────────────────────────────────

test('>24h total → 400 OVER_24H', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  // Fill the day with 23h
  await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'big block', duration_minutes: 23 * 60,
    slot_start: '00:00', slot_end: '23:00', work_date: DATE_24H,
  }, cookie);

  // Try to add 2h more (total would be 25h)
  const res  = await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'overflow', duration_minutes: 120,
    slot_start: '23:00', slot_end: '23:59', work_date: DATE_24H,
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'OVER_24H');
});

test('overlapping slots → 200 with warnings (not blocked)', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  // First entry: 09:00–11:00
  await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'first block', duration_minutes: 120,
    slot_start: '09:00', slot_end: '11:00', work_date: DATE_OVERLAP,
  }, cookie);

  // Second entry overlaps: 10:00–12:00
  const res  = await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'overlapping block', duration_minutes: 120,
    slot_start: '10:00', slot_end: '12:00', work_date: DATE_OVERLAP,
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 201, 'overlap is saved (not blocked)');
  assert.ok(body.warnings.length > 0, 'overlap warning returned');
  assert.equal(body.warnings[0].kind, 'overlap');
});

test('jira_task_id from wrong project → 400 INVALID_TASK', async () => {
  const cookie   = await login('yogesh@iksula.com');
  const projects = (await (await get('/api/projects', cookie)).json()).projects;
  assert.ok(projects.length >= 2, 'need at least 2 projects for this test');

  const p1Tasks = (await (await get(`/api/projects/${projects[0].id}/tasks`, cookie)).json()).tasks;
  const p2      = projects[1];

  const res  = await post('/api/entries', {
    project_id: p2.id, jira_task_id: p1Tasks[0].id, // task from p1, project is p2
    description: 'wrong task', duration_minutes: 30,
    slot_start: '08:00', slot_end: '08:30', work_date: DATE_CRUD,
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'INVALID_TASK');
});

test('bad work_date format → 400 VALIDATION', async () => {
  const cookie  = await login('yogesh@iksula.com');
  const project = await getFirstProject(cookie);
  const task    = await getFirstTask(project.id, cookie);

  const res  = await post('/api/entries', {
    project_id: project.id, jira_task_id: task.id,
    description: 'bad date', duration_minutes: 30,
    slot_start: '08:00', slot_end: '08:30', work_date: '22-05-2026', // wrong format
  }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'VALIDATION');
  assert.ok(body.error.message.includes('work_date'));
});

// ── Timezone ─────────────────────────────────────────────────────────────

test('parser.toJiraStarted produces +0530 IST offset', () => {
  const { toJiraStarted } = require('../services/parser');
  const started = toJiraStarted('2026-05-22', '14:30');
  assert.equal(started, '2026-05-22T14:30:00.000+0530');
  assert.ok(started.endsWith('+0530'), 'IST offset explicit in Jira started field');
});
