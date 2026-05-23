// ops.test.js — Integration tests for EP-16..EP-18 and the compliance run logic.
// Covers: EP-16 compliance tracker shape + leave-adjusted targets (FR-12/17);
//         EP-17 manual run-check, EP-18 run history; monday recheck drops complied (FR-16).
// Mock strategy: module-cache override on notifier (same pattern as day.test.js).
// Node 18 built-in runner + fetch. No extra deps.

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Mock notifier BEFORE server require so compliance.js never tries real Gmail.
const notifier   = require('../services/notifier');
const _origNotify = notifier.sendComplianceReminder;
notifier.sendComplianceReminder = async () => {};

const app = require('../server');

// Far-future date — no worklog entries exist in this week.
const DATE_OPS = '2099-03-01';

let server, base;

before(() => new Promise(resolve => {
  const { db } = require('../db');
  // Wipe any reminder state and leave days this suite created.
  db.prepare("DELETE FROM reminder_recipients WHERE reminder_run_id IN (SELECT id FROM reminder_runs WHERE triggered_by IN ('manual','test'))").run();
  db.prepare("DELETE FROM reminder_runs WHERE triggered_by IN ('manual','test')").run();
  db.prepare("DELETE FROM leave_days WHERE user_id = 2 AND leave_date LIKE '2099-03-%'").run();
  // Remove any test entries inserted for the monday recheck test.
  db.prepare("DELETE FROM worklog_entries WHERE user_id = 2 AND work_date = ?").run(new Date().toISOString().slice(0, 10));

  server = app.listen(0, () => {
    base = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => {
  notifier.sendComplianceReminder = _origNotify;
  // Restore weekly target to 40 in case a test lowered it.
  const { db } = require('../db');
  db.prepare("UPDATE settings SET value='40' WHERE key='weekly_target_hours'").run();
  return new Promise(resolve => server.close(resolve));
});

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

async function post(path, body, cookie) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

// ── EP-16 compliance tracker ──────────────────────────────────────────────────

test('EP-16 GET /api/ops/compliance → 200, rows array with user fields', async () => {
  const cookie = await login('omkar@iksula.com');
  const res    = await get(`/api/ops/compliance?date=${DATE_OPS}`, cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.week_start,             'week_start present');
  assert.ok(body.week_end,               'week_end present');
  assert.ok(typeof body.target_hours === 'number', 'target_hours is a number');
  assert.ok(Array.isArray(body.rows),    'rows is array');
  assert.ok(body.rows.length > 0,        'at least one row');
  const row = body.rows[0];
  assert.ok('user_id'      in row, 'user_id');
  assert.ok('name'         in row, 'name');
  assert.ok('week_hours'   in row, 'week_hours');
  assert.ok('target_hours' in row, 'target_hours');
  assert.ok('leave_hours'  in row, 'leave_hours');
  assert.ok('hours_short'  in row, 'hours_short');
  assert.ok('status'       in row, 'status');
});

test('EP-16 user with 0 hours logged → status:short, hours_short > 0', async () => {
  const cookie = await login('omkar@iksula.com');
  const body   = await (await get(`/api/ops/compliance?date=${DATE_OPS}`, cookie)).json();
  // DATE_OPS is far future — no one has entries that week → all users are short.
  assert.ok(body.rows.every(r => r.status === 'short'), 'all users short on far-future date');
  assert.ok(body.rows.every(r => r.hours_short > 0),   'hours_short > 0 for all');
});

test('EP-16 user with leave covering full week → target_hours=0, status=met (FR-17)', async () => {
  const { db } = require('../db');
  // Insert 5 leave days (Mon–Fri) in the DATE_OPS week (2099-03-01 is Mon 2099-03-01 ISO week).
  // weekBounds('2099-03-01'): Mon 2099-02-24, Sun 2099-03-02 — so use dates in that range.
  // Simpler: compute the week manually.
  function weekBounds(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const day = d.getUTCDay();
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    const days = [];
    for (let i = 0; i < 5; i++) {
      const dd = new Date(mon);
      dd.setUTCDate(mon.getUTCDate() + i);
      days.push(dd.toISOString().slice(0, 10));
    }
    return days;
  }
  const leaveDates = weekBounds(DATE_OPS);
  for (const d of leaveDates) {
    db.prepare(
      "INSERT OR REPLACE INTO leave_days (user_id, leave_date, leave_type, hours, created_by_user_id) VALUES (2, ?, 'pto', 8, 8)"
    ).run(d);
  }

  const cookie = await login('omkar@iksula.com');
  const body   = await (await get(`/api/ops/compliance?date=${DATE_OPS}`, cookie)).json();
  const kevalRow = body.rows.find(r => r.user_id === 2);
  assert.ok(kevalRow,                    'Keval row present');
  assert.equal(kevalRow.target_hours, 0, 'adjusted target = 0 (leave covers full week)');
  assert.equal(kevalRow.leave_hours, 40, '40h of leave');
  assert.equal(kevalRow.status, 'met',   'status = met when target = 0');
  assert.equal(kevalRow.hours_short, 0,  'hours_short = 0');

  // Cleanup.
  db.prepare("DELETE FROM leave_days WHERE user_id = 2 AND leave_date LIKE '2099-%'").run();
});

test('EP-16 as employee → 403 FORBIDDEN', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await get(`/api/ops/compliance?date=${DATE_OPS}`, cookie);
  const body   = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

// ── EP-17 run-check ────────────────────────────────────────────────────────────

test('EP-17 POST run-check friday → 200 with run_id, recipients (FR-16)', async () => {
  // Use a low weekly target so seeded entries can meet it.
  const { db } = require('../db');
  db.prepare("UPDATE settings SET value='0.5' WHERE key='weekly_target_hours'").run(); // 30 min target

  const cookie = await login('omkar@iksula.com');
  const res    = await post('/api/ops/run-check', { type: 'friday' }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.run_id,                    'run_id present');
  assert.equal(body.type, 'friday');
  assert.ok(body.week_start,                'week_start present');
  assert.ok(typeof body.recipients_count === 'number', 'recipients_count is a number');
  assert.ok(Array.isArray(body.recipients), 'recipients is array');
  if (body.recipients.length > 0) {
    const r = body.recipients[0];
    assert.ok('user_id'     in r, 'recipient user_id');
    assert.ok('name'        in r, 'recipient name');
    assert.ok('week_hours'  in r, 'recipient week_hours');
    assert.ok('hours_short' in r, 'recipient hours_short');
  }
});

test('EP-18 GET reminders includes the run from run-check', async () => {
  const cookie = await login('omkar@iksula.com');
  const body   = await (await get('/api/ops/reminders', cookie)).json();
  assert.ok(Array.isArray(body.runs),  'runs is array');
  assert.ok(body.runs.length >= 1,     'at least one run recorded');
  const latest = body.runs[0];
  assert.equal(latest.run_type, 'friday', 'most recent run is a friday run');
  assert.equal(latest.triggered_by, 'manual', 'triggered by manual');
});

test('EP-17 invalid type → 400 BAD_REQUEST', async () => {
  const cookie = await login('omkar@iksula.com');
  const res    = await post('/api/ops/run-check', { type: 'wednesday' }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

test('EP-17 monday recheck: user who met target is dropped from recipients (FR-16)', async () => {
  // Continues from the friday run created in test 5 (target still 0.5h = 30 min).
  // Yogesh + Sneha already have >30 min this week (seeded), so they're NOT in friday recipients.
  // Keval has 0 min → IS in friday recipients as pending.
  // Now insert 40 min for Keval this week → Keval meets 30 min target.
  const { db } = require('../db');
  const today  = new Date().toISOString().slice(0, 10);

  // Get a valid project and task id for the entry.
  const project = db.prepare("SELECT id FROM projects WHERE is_active=1 LIMIT 1").get();
  const task    = db.prepare("SELECT id FROM jira_tasks WHERE project_id=? AND is_active=1 LIMIT 1").get(project.id);
  db.prepare(`
    INSERT INTO worklog_entries
      (user_id, project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date, status)
    VALUES (2, ?, ?, 'test monday recheck entry', 40, '10:00', '10:40', ?, 'draft')
  `).run(project.id, task.id, today);

  const cookie = await login('omkar@iksula.com');
  const res    = await post('/api/ops/run-check', { type: 'monday' }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.type, 'monday');

  // Keval (user_id=2) must NOT appear in the monday recipients — he's been complied.
  const kevalInMonday = (body.recipients || []).some(r => r.user_id === 2);
  assert.equal(kevalInMonday, false, 'Keval met target — must not be in monday recipients');

  // Cleanup.
  db.prepare("DELETE FROM worklog_entries WHERE user_id=2 AND work_date=? AND description='test monday recheck entry'").run(today);
  db.prepare("UPDATE settings SET value='40' WHERE key='weekly_target_hours'").run();
});

// ── EP-17 manual run-check ────────────────────────────────────────────────────

test('EP-17 manual run-check with recipientIds → 200 with run_id', async () => {
  const cookie = await login('omkar@iksula.com');
  // User id=2 (Keval) is a valid employee — send manual reminder to them.
  const res  = await post('/api/ops/run-check', { type: 'manual', recipientIds: [2] }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.run_id,         'run_id present');
  assert.equal(body.type, 'manual');
  assert.ok(Array.isArray(body.recipients), 'recipients array');
});

test('EP-17 manual run-check with empty recipientIds → 400 BAD_REQUEST', async () => {
  const cookie = await login('omkar@iksula.com');
  const res  = await post('/api/ops/run-check', { type: 'manual', recipientIds: [] }, cookie);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
});

test('EP-18 reminders enriched with emailed + complied counts', async () => {
  const cookie = await login('omkar@iksula.com');
  const body   = await (await get('/api/ops/reminders', cookie)).json();
  assert.ok(Array.isArray(body.runs), 'runs is array');
  if (body.runs.length > 0) {
    const run = body.runs[0];
    assert.ok('emailed'    in run, 'run.emailed present');
    assert.ok('complied'   in run, 'run.complied present');
    assert.ok('recipients' in run, 'run.recipients present');
    assert.ok(Array.isArray(run.recipients), 'run.recipients is array');
  }
});
