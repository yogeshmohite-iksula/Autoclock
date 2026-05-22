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

function init() {
  const ddl = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(ddl);
  seedIfEmpty();
  return db;
}

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;

  const tx = db.transaction(() => {
    // Teams
    db.prepare("INSERT INTO teams (name) VALUES (?), (?)").run('SiteOne QA', 'Modern Electronics QA');

    // Users — 1 demo user + sample roles
    db.prepare(`INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
                VALUES (?, ?, ?, ?, 'active', 1)`)
      .run('Yogesh Mohite', 'yogesh@iksula.com', 'employee', 1);
    db.prepare(`INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
                VALUES (?, ?, ?, ?, 'active', 1)`)
      .run('Priya K', 'priya@iksula.com', 'pm_lead', 1);
    db.prepare(`INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
                VALUES (?, ?, ?, ?, 'active', 1)`)
      .run('Omkar P', 'omkar@iksula.com', 'operations', NULL);

    // Projects (ERD §5.2)
    const projects = [
      ['SiteOne PIMCore', 'PIM'],
      ['Modern Electronics Lego', 'ML'],
      ['CUMI Pimcore Implementation', 'CUMI'],
      ['Internal / Meetings', 'INTERNAL'],
      ['Bench', 'BENCH'],
    ];
    const insProj = db.prepare('INSERT INTO projects (name, jira_project_key, is_active) VALUES (?, ?, 1)');
    for (const [n, k] of projects) insProj.run(n, k);

    // Jira tasks (admin-seeded demo set — ERD §14.2)
    const tasks = [
      ['PIM-3073', 'UOM rules + test cases', 1],
      ['PIM-3162', 'Product attributes validation', 1],
      ['PIM-2753', 'Catalog import edge cases', 1],
      ['ML-1045', 'Cart pricing — discount stack', 2],
      ['ML-1044', 'Wishlist sync', 2],
      ['ML-70', 'Checkout flow regression', 2],
      ['CUMI-410', 'Master data ingestion', 3],
      ['CUMI-388', 'Workflow approval rules', 3],
      ['INTERNAL-1', 'Daily Scrum', 4],
      ['INTERNAL-2', 'Backlog Grooming', 4],
      ['BENCH-1', 'Bench / learning', 5],
    ];
    const insTask = db.prepare('INSERT INTO jira_tasks (jira_key, summary, project_id, is_active) VALUES (?, ?, ?, 1)');
    for (const [k, s, p] of tasks) insTask.run(k, s, p);

    // Settings (ERD §5.2)
    const insSet = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insSet.run('reminder_cadence', 'gentle');
    insSet.run('weekly_target_hours', '40');
    insSet.run('default_meeting_ticket', 'INTERNAL-1');
  });
  tx();
}

module.exports = { db, init };
