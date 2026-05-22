// db.js — SQLite (WAL mode) connection + first-boot schema + seed.
// 60 users comfortably; PostgreSQL is a future free upgrade path (ADR-04).

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'autoclock.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');   // wait up to 5s instead of immediate SQLITE_BUSY (Fly restarts cause brief contention)
db.pragma('synchronous = NORMAL');  // safe with WAL; ~2x faster writes vs FULL on rotational disk
db.pragma('cache_size = -16000');   // 16 MB page cache (negative = kibibytes); hot dataset fits easily
db.pragma('temp_store = MEMORY');   // ORDER BY / GROUP BY temp tables in RAM

function init() {
  const ddl = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(ddl);
  seedIfEmpty();
  return db;
}

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;

  const today = new Date().toISOString().slice(0, 10); // UTC date — acceptable for demo seed

  const tx = db.transaction(() => {
    // ── Teams ───────────────────────────────────────────────────────────────
    db.prepare("INSERT INTO teams (name) VALUES (?), (?)").run('SiteOne QA', 'Modern Electronics QA');

    // ── Users — 10 across all 5 roles, 2 teams (ERD §5.2 + plan) ───────────
    const insUser = db.prepare(`
      INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
      VALUES (?, ?, ?, ?, 'active', 1)
    `);
    // team 1 — SiteOne QA
    insUser.run('Yogesh Mohite',  'yogesh@iksula.com',  'employee',    1);
    insUser.run('Keval Parikh',   'keval@iksula.com',   'employee',    1);
    insUser.run('Anjali Nair',    'anjali@iksula.com',  'employee',    1);
    insUser.run('Priya Kulkarni', 'priya@iksula.com',   'pm_lead',     1);
    // team 2 — Modern Electronics QA
    insUser.run('Sneha Joshi',    'sneha@iksula.com',   'employee',    2);
    insUser.run('Rahul Gupta',    'rahul@iksula.com',   'employee',    2);
    insUser.run('Divya Shah',     'divya@iksula.com',   'pm_lead',     2);
    // no team
    insUser.run('Omkar Patil',    'omkar@iksula.com',   'operations',  null);
    insUser.run('Arjun Mehta',    'arjun@iksula.com',   'management',  null);
    insUser.run('Tejas Dongre',   'tejas@iksula.com',   'admin',       null);

    // ── Set team leads (must come AFTER users are inserted) ─────────────────
    db.prepare('UPDATE teams SET lead_user_id=(SELECT id FROM users WHERE email=?) WHERE name=?')
      .run('priya@iksula.com', 'SiteOne QA');
    db.prepare('UPDATE teams SET lead_user_id=(SELECT id FROM users WHERE email=?) WHERE name=?')
      .run('divya@iksula.com', 'Modern Electronics QA');

    // ── Projects (ERD §5.2) ─────────────────────────────────────────────────
    const projects = [
      ['SiteOne PIMCore',             'PIM'],
      ['Modern Electronics Lego',     'ML'],
      ['CUMI Pimcore Implementation', 'CUMI'],
      ['Internal / Meetings',         'INTERNAL'],
      ['Bench',                       'BENCH'],
    ];
    const insProj = db.prepare('INSERT INTO projects (name, jira_project_key, is_active) VALUES (?, ?, 1)');
    for (const [n, k] of projects) insProj.run(n, k);

    // ── Jira tasks (admin-seeded demo set — ERD §14.2 M0) ───────────────────
    const tasks = [
      ['PIM-3073', 'UOM rules + test cases',         1],
      ['PIM-3162', 'Product attributes validation',  1],
      ['PIM-2753', 'Catalog import edge cases',      1],
      ['ML-1045',  'Cart pricing — discount stack',  2],
      ['ML-1044',  'Wishlist sync',                  2],
      ['ML-70',    'Checkout flow regression',       2],
      ['CUMI-410', 'Master data ingestion',          3],
      ['CUMI-388', 'Workflow approval rules',        3],
      ['INTERNAL-1', 'Daily Scrum',                  4],
      ['INTERNAL-2', 'Backlog Grooming',             4],
      ['BENCH-1',  'Bench / learning',               5],
    ];
    const insTask = db.prepare('INSERT INTO jira_tasks (jira_key, summary, project_id, is_active) VALUES (?, ?, ?, 1)');
    for (const [k, s, p] of tasks) insTask.run(k, s, p);

    // ── Settings (ERD §5.2) ─────────────────────────────────────────────────
    const insSet = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insSet.run('reminder_cadence',       'gentle');
    insSet.run('weekly_target_hours',    '40');
    insSet.run('default_meeting_ticket', 'INTERNAL-1');

    // ── Worklog entries for today — makes EP-12/13 immediately testable ──────
    // Resolve IDs by jira_key (safe — we just inserted them above)
    const taskId = (key) => db.prepare('SELECT id FROM jira_tasks WHERE jira_key=?').get(key).id;
    const projId = (key) => db.prepare('SELECT id FROM projects WHERE jira_project_key=?').get(key).id;
    const userId = (email) => db.prepare('SELECT id FROM users WHERE email=?').get(email).id;

    const insEntry = db.prepare(`
      INSERT INTO worklog_entries
        (user_id, project_id, jira_task_id, description, duration_minutes,
         slot_start, slot_end, work_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `);

    // Yogesh — 3 entries (Close My Day demo data)
    const yogeshId = userId('yogesh@iksula.com');
    insEntry.run(yogeshId, projId('PIM'), taskId('PIM-3073'), 'UOM rules — test cases written and reviewed', 90,  '09:00', '10:30', today);
    insEntry.run(yogeshId, projId('PIM'), taskId('PIM-3162'), 'Product attributes validation — edge cases',  60,  '10:30', '11:30', today);
    insEntry.run(yogeshId, projId('INTERNAL'), taskId('INTERNAL-1'), 'Daily Scrum',                         30,  '11:30', '12:00', today);

    // Sneha — 2 entries (populates team-2 dashboard)
    const snehaId = userId('sneha@iksula.com');
    insEntry.run(snehaId, projId('ML'), taskId('ML-1045'), 'Cart pricing — discount stack testing', 120, '09:00', '11:00', today);
    insEntry.run(snehaId, projId('ML'), taskId('ML-70'),   'Checkout flow regression',               60, '11:00', '12:00', today);
  });
  tx();
}

module.exports = { db, init };
