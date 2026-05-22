// day.test.js — Integration tests for EP-12 (preview) and EP-13 (Close My Day sync).
// Covers: preview accuracy (FR-04), no side-effects, idempotency (FR-22),
// per-system status + isolation (FR-08), partial failure, retry, EOD report (TB-07).
// Node 18 built-in runner + fetch. No extra deps.
//
// Mock strategy: override properties on the module-cache objects.  day.js holds
// references to the same jiraSvc/sheetsSvc/gmailSvc objects, so replacing a
// property here is visible there at call time — no extra tooling required.

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON    = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Capture module refs and save originals BEFORE requiring server.
const jiraSvc   = require('../services/jira');
const sheetsSvc = require('../services/sheets');
const gmailSvc  = require('../services/gmail');

const _origJira   = jiraSvc.createWorklog;
const _origSheets = sheetsSvc.appendRow;
const _origGmail  = gmailSvc.createDraftFromGroups;

function installDefaultMocks() {
  jiraSvc.createWorklog          = async (_u, key) => `mock-wl-${key}`;
  sheetsSvc.appendRow            = async ()        => 'MockSheet!A1:C1';
  gmailSvc.createDraftFromGroups = async ()        => 'mock-draft-id';
}

// Install before app is required so no real credentials are needed at load time.
installDefaultMocks();

const app = require('../server');

const DATE_CLOSE   = '2099-02-15'; // preview + success + idempotency + EOD tests
const DATE_PARTIAL = '2099-02-16'; // partial-failure + retry tests

let server, base;

before(() => new Promise(resolve => {
  const { db } = require('../db');
  // Cascade on worklog_entries → external_writes handles the join table.
  for (const d of [DATE_CLOSE, DATE_PARTIAL]) {
    db.prepare("DELETE FROM eod_reports     WHERE work_date = ?").run(d);
    db.prepare("DELETE FROM worklog_entries WHERE work_date = ?").run(d);
  }
  server = app.listen(0, () => {
    base = `http://localhost:${server.address().port}`;
    resolve();
  });
}));

after(() => {
  jiraSvc.createWorklog          = _origJira;
  sheetsSvc.appendRow            = _origSheets;
  gmailSvc.createDraftFromGroups = _origGmail;
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

// Returns { project, task } for the nth project in the seed list.
async function getProjectAndTask(cookie, index = 0) {
  const projects = (await (await get('/api/projects', cookie)).json()).projects;
  const project  = projects[index];
  const tasks    = (await (await get(`/api/projects/${project.id}/tasks`, cookie)).json()).tasks;
  return { project, task: tasks[0] };
}

async function createEntry(cookie, projectId, taskId, workDate, overrides = {}) {
  const res = await post('/api/entries', {
    project_id: projectId, jira_task_id: taskId,
    description: 'test work', duration_minutes: 60,
    slot_start: '09:00', slot_end: '10:00', work_date: workDate,
    ...overrides,
  }, cookie);
  return (await res.json()).entry;
}

function getExternalWriteRows(date) {
  const { db } = require('../db');
  return db.prepare(
    "SELECT system, status, external_id FROM external_writes WHERE work_date = ? ORDER BY id"
  ).all(date);
}

// ── EP-12 Preview ─────────────────────────────────────────────────────────────

test('EP-12 preview — empty day returns empty groups', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await post('/api/day/preview', { work_date: DATE_CLOSE }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.groups,    []);
  assert.equal(body.total_minutes, 0);
  assert.deepEqual(body.errors,    []);
  assert.ok(Array.isArray(body.warnings));
});

test('EP-12 preview — 2 entries on 2 different tickets → 2 groups, correct minutes', async () => {
  const cookie = await login('yogesh@iksula.com');
  const pt1    = await getProjectAndTask(cookie, 0);
  const pt2    = await getProjectAndTask(cookie, 1);

  // These entries persist for subsequent tests (tests 3–7, 10).
  await createEntry(cookie, pt1.project.id, pt1.task.id, DATE_CLOSE,
    { duration_minutes: 60, slot_start: '09:00', slot_end: '10:00' });
  await createEntry(cookie, pt2.project.id, pt2.task.id, DATE_CLOSE,
    { duration_minutes: 90, slot_start: '10:00', slot_end: '11:30' });

  const res  = await post('/api/day/preview', { work_date: DATE_CLOSE }, cookie);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.groups.length,  2, '2 ticket groups');
  assert.equal(body.total_minutes, 150, '60 + 90 = 150');
  assert.equal(body.work_date, DATE_CLOSE);
});

test('EP-12 preview writes nothing to external_writes (FR-04)', async () => {
  const cookie = await login('yogesh@iksula.com');
  await post('/api/day/preview', { work_date: DATE_CLOSE }, cookie);
  assert.equal(getExternalWriteRows(DATE_CLOSE).length, 0, 'preview must not write to external_writes');
});

// ── EP-13 Guard gates ─────────────────────────────────────────────────────────

test('EP-13 close without confirmed:true → 400 NOT_CONFIRMED', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await post('/api/day/close', { work_date: DATE_CLOSE }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'NOT_CONFIRMED');
});

// ── EP-13 Successful sync ─────────────────────────────────────────────────────

test('EP-13 close (confirmed) → all systems ok, correct result shape', async () => {
  const cookie = await login('yogesh@iksula.com');
  const res    = await post('/api/day/close', { work_date: DATE_CLOSE, confirmed: true }, cookie);
  const body   = await res.json();
  assert.equal(res.status, 200);
  // 2 entries → 2 Jira worklogs
  assert.equal(body.jira.ok,              2);
  assert.equal(body.jira.failed,          0);
  assert.equal(body.jira.worklog_ids.length, 2);
  // 2 different ticket groups → 2 sheet rows
  assert.equal(body.sheet.ok,             true);
  assert.equal(body.sheet.rows_appended,  2);
  // 1 Gmail draft per day
  assert.equal(body.gmail.ok,             true);
  assert.ok(body.gmail.draft_id,          'draft_id must be set');
  assert.equal(body.overall,              'ok');
});

test('EP-13 after close — external_writes has 5 synced rows', async () => {
  const rows = getExternalWriteRows(DATE_CLOSE);
  assert.equal(rows.length, 5, '2 jira + 2 sheet + 1 gmail = 5 rows');
  assert.ok(rows.every(r => r.status === 'synced'), 'all rows must be synced');
  // Verify external_ids are stored correctly
  const jiraRows  = rows.filter(r => r.system === 'jira');
  const sheetRows = rows.filter(r => r.system === 'sheet');
  const gmailRows = rows.filter(r => r.system === 'gmail');
  assert.ok(jiraRows.every(r  => r.external_id.startsWith('mock-wl-')));
  assert.ok(sheetRows.every(r => r.external_id === 'MockSheet!A1:C1'));
  assert.equal(gmailRows[0].external_id, 'mock-draft-id');
});

test('EP-13 double-close — skips all synced rows; mock services not called (FR-22)', async () => {
  const cookie = await login('yogesh@iksula.com');

  let jiraCalls = 0, sheetCalls = 0, gmailCalls = 0;
  jiraSvc.createWorklog          = async (_u, k) => { jiraCalls++;  return `mock-wl-${k}`; };
  sheetsSvc.appendRow            = async ()      => { sheetCalls++; return 'MockSheet!A1:C1'; };
  gmailSvc.createDraftFromGroups = async ()      => { gmailCalls++; return 'mock-draft-id'; };

  try {
    const res  = await post('/api/day/close', { work_date: DATE_CLOSE, confirmed: true }, cookie);
    const body = await res.json();
    assert.equal(res.status,   200);
    assert.equal(jiraCalls,    0, 'Jira must not be called on double-close');
    assert.equal(sheetCalls,   0, 'Sheets must not be called on double-close');
    assert.equal(gmailCalls,   0, 'Gmail must not be called on double-close');
    assert.equal(body.jira.ok, 2, 'result still reports 2 succeeded');
    assert.equal(body.overall, 'ok');
  } finally {
    installDefaultMocks();
  }
});

// ── EP-13 Partial failure + retry ─────────────────────────────────────────────

test('EP-13 partial failure: 2nd Jira write throws → sheet+gmail still succeed', async () => {
  const cookie = await login('yogesh@iksula.com');
  const pt1    = await getProjectAndTask(cookie, 0);
  const pt2    = await getProjectAndTask(cookie, 1);

  await createEntry(cookie, pt1.project.id, pt1.task.id, DATE_PARTIAL,
    { duration_minutes: 60, slot_start: '09:00', slot_end: '10:00' });
  await createEntry(cookie, pt2.project.id, pt2.task.id, DATE_PARTIAL,
    { duration_minutes: 60, slot_start: '10:00', slot_end: '11:00' });

  let jiraCallCount = 0;
  jiraSvc.createWorklog = async (_u, key) => {
    jiraCallCount++;
    if (jiraCallCount === 2) throw new Error('Jira temporarily down');
    return `mock-wl-${key}`;
  };

  try {
    const res  = await post('/api/day/close', { work_date: DATE_PARTIAL, confirmed: true }, cookie);
    const body = await res.json();
    assert.equal(res.status,       200);
    assert.equal(body.jira.ok,     1, '1st Jira write succeeded');
    assert.equal(body.jira.failed, 1, '2nd Jira write failed');
    assert.equal(body.sheet.ok,    true,  'sheet succeeded despite Jira failure');
    assert.equal(body.gmail.ok,    true,  'gmail succeeded despite Jira failure');
    assert.equal(body.overall,     'partial');
    // Confirm the failed row is in the ledger
    const failedRow = getExternalWriteRows(DATE_PARTIAL).find(r => r.system === 'jira' && r.status === 'failed');
    assert.ok(failedRow, 'failed jira row must exist in external_writes');
  } finally {
    installDefaultMocks();
  }
});

test('EP-13 retry — only the failed Jira entry is retried; synced rows are skipped', async () => {
  // Continues from the partial-failure test state on DATE_PARTIAL.
  const cookie = await login('yogesh@iksula.com');

  let jiraCalls = 0, sheetCalls = 0, gmailCalls = 0;
  jiraSvc.createWorklog          = async (_u, k) => { jiraCalls++;  return `mock-wl-${k}`; };
  sheetsSvc.appendRow            = async ()      => { sheetCalls++; return 'MockSheet!A1:C1'; };
  gmailSvc.createDraftFromGroups = async ()      => { gmailCalls++; return 'mock-draft-id'; };

  try {
    const res  = await post('/api/day/close', { work_date: DATE_PARTIAL, confirmed: true }, cookie);
    const body = await res.json();
    assert.equal(res.status,        200);
    assert.equal(jiraCalls,         1, 'exactly 1 Jira call: the previously-failed entry only');
    assert.equal(sheetCalls,        0, 'sheet rows already synced — must not re-call');
    assert.equal(gmailCalls,        0, 'gmail draft already synced — must not re-call');
    assert.equal(body.jira.ok,      2, 'all Jira writes now succeeded');
    assert.equal(body.jira.failed,  0);
    assert.equal(body.overall,      'ok');
  } finally {
    installDefaultMocks();
  }
});

// ── EOD report (TB-07) ────────────────────────────────────────────────────────

test('EP-13 eod_reports row upserted with correct status and draft_id after close', async () => {
  // Uses state from the successful close on DATE_CLOSE (tests 5–7).
  const { db } = require('../db');
  const row = db.prepare(
    "SELECT * FROM eod_reports WHERE work_date = ? AND user_id = 1"
  ).get(DATE_CLOSE);
  assert.ok(row,                   'eod_reports row must exist');
  assert.equal(row.status,          'ok');
  assert.equal(row.sheet_appended,  1);
  assert.equal(row.gmail_draft_id,  'mock-draft-id');
});
