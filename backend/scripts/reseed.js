#!/usr/bin/env node
// scripts/reseed.js — wipe all user-data tables and re-run the seed.
// Use this to reset a dev DB to a known demo state without deleting the file.
//
// Usage:
//   node scripts/reseed.js           (dry-run confirmation prompt)
//   node scripts/reseed.js --yes     (skip prompt — for CI / Makefile)
//
// NEVER run against the production DB.

const path = require('path');
const readline = require('readline');

// Honour DB_FILE so the same env used by the server is respected.
process.env.DB_FILE = process.env.DB_FILE ||
  path.join(__dirname, '..', 'autoclock.db');

const { db } = require('../db');

const TABLES = [
  'external_writes',
  'eod_reports',
  'worklog_entries',
  'reminder_recipients',
  'reminder_runs',
  'leave_days',
  'user_connections',
  'audit_log',
  'settings',
  'jira_tasks',
  'projects',
  'users',
  'teams',
];

function wipe() {
  // Disable FK checks while wiping so ordering of deletes doesn't matter.
  db.pragma('foreign_keys = OFF');
  const wipeAll = db.transaction(() => {
    for (const t of TABLES) {
      db.prepare(`DELETE FROM ${t}`).run();
      // Reset autoincrement counters where the sqlite_sequence row exists.
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(t);
    }
  });
  wipeAll();
  db.pragma('foreign_keys = ON');
}

function reseed() {
  // Re-use the same seedIfEmpty logic by temporarily lying about the user count.
  // Easier: just call the private seed function directly.
  // db.js doesn't export seedIfEmpty, so we call init() after wiping (userCount=0).
  require('../db').init();
}

function run() {
  console.log('\n⚠  This will DELETE all data in:', process.env.DB_FILE);
  console.log('   Tables wiped:', TABLES.join(', '), '\n');
  wipe();
  reseed();
  const counts = TABLES.map(t => {
    const n = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    return `  ${t}: ${n}`;
  }).join('\n');
  console.log('✓ Reseed complete.\n' + counts + '\n');
}

if (process.argv.includes('--yes')) {
  run();
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Type YES to confirm wipe + reseed: ', answer => {
    rl.close();
    if (answer.trim() === 'YES') {
      run();
    } else {
      console.log('Aborted.');
      process.exit(0);
    }
  });
}
