// scripts/verify-db.js — database health check.
// Runs init(), then asserts 13 tables, 6 indexes, seed counts, pragma values.
// Exit 0 on full pass; exit 1 with a failure list on any miss.
// Usage: node scripts/verify-db.js
//        (or on Fly.io: fly ssh console -C "node /app/backend/scripts/verify-db.js")

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db, init } = require('../db');
init();

const failures = [];
function check(label, pass, detail = '') {
  const mark = pass ? '✓' : '✗';
  console.log(`  ${mark}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!pass) failures.push(label);
}

console.log('\n── AutoClock DB verify ──────────────────────────────────────');

// ── 1. All 13 tables ──────────────────────────────────────────────────────
console.log('\n[1] Tables (TB-01..TB-13)');
const TABLES = [
  'users', 'teams', 'projects', 'jira_tasks', 'worklog_entries',
  'user_connections', 'eod_reports', 'reminder_runs', 'reminder_recipients',
  'leave_days', 'settings', 'audit_log', 'external_writes',
];
const existingTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
);
for (const t of TABLES) check(t, existingTables.has(t));

// ── 2. All 6 required indexes ──────────────────────────────────────────────
console.log('\n[2] Indexes');
const INDEXES = [
  'idx_jira_tasks_project',
  'idx_worklog_entries_user_date',
  'idx_worklog_entries_status',
  'idx_audit_log_actor',
  'idx_external_writes_unique',
  'idx_external_writes_user_date',
];
const existingIndexes = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name)
);
for (const i of INDEXES) check(i, existingIndexes.has(i));

// ── 3. Seed counts ─────────────────────────────────────────────────────────
console.log('\n[3] Seed counts');
const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
check('users ≥ 8',     count('users')           >= 8,  `got ${count('users')}`);
check('teams ≥ 2',     count('teams')            >= 2,  `got ${count('teams')}`);
check('projects = 5',  count('projects')         === 5, `got ${count('projects')}`);
check('jira_tasks = 11', count('jira_tasks')     === 11, `got ${count('jira_tasks')}`);
check('settings ≥ 3',  count('settings')         >= 3,  `got ${count('settings')}`);
check('entries ≥ 3',   count('worklog_entries')  >= 3,  `got ${count('worklog_entries')}`);

// ── 4. All 5 roles present ─────────────────────────────────────────────────
console.log('\n[4] Roles coverage');
const roles = db.prepare('SELECT DISTINCT role FROM users').all().map(r => r.role);
for (const r of ['employee', 'pm_lead', 'management', 'operations', 'admin']) {
  check(r, roles.includes(r));
}

// ── 5. Team leads set ──────────────────────────────────────────────────────
console.log('\n[5] Team leads');
const teamsWithLead = db.prepare('SELECT COUNT(*) AS n FROM teams WHERE lead_user_id IS NOT NULL').get().n;
const totalTeams    = count('teams');
check(`all ${totalTeams} teams have lead_user_id`, teamsWithLead === totalTeams, `${teamsWithLead}/${totalTeams}`);

// ── 6. Required settings keys ──────────────────────────────────────────────
console.log('\n[6] Settings keys');
const settingKeys = new Set(db.prepare('SELECT key FROM settings').all().map(r => r.key));
for (const k of ['reminder_cadence', 'weekly_target_hours', 'default_meeting_ticket']) {
  check(k, settingKeys.has(k));
}

// ── 7. FK integrity ────────────────────────────────────────────────────────
console.log('\n[7] Foreign key integrity');
const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
check('PRAGMA foreign_key_check = 0 rows', fkViolations.length === 0, `got ${fkViolations.length} violation(s)`);

// ── 8. WAL mode ────────────────────────────────────────────────────────────
console.log('\n[8] Pragmas');
const jm = db.pragma('journal_mode', { simple: true });
check('journal_mode = wal', jm === 'wal', `got ${jm}`);

const bt = db.pragma('busy_timeout', { simple: true });
check('busy_timeout = 5000', bt === 5000, `got ${bt}`);

// ── Result ─────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────');
if (failures.length === 0) {
  console.log('✓ All checks passed.\n');
  process.exit(0);
} else {
  console.log(`✗ ${failures.length} check(s) FAILED:\n`);
  for (const f of failures) console.log(`    • ${f}`);
  console.log();
  process.exit(1);
}
