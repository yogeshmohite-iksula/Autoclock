// sync.js — idempotent "Close My Day" orchestrator. DevDoc §6.8 / ADR-09.
// Keyed on (user_id, work_date). One row per (entry × system) in TB-13 external_writes.
// A double-click, refresh, or retry NEVER creates a duplicate worklog/row/draft.

const Q = require('../db/queries');

const SYSTEMS = ['jira', 'sheet', 'gmail'];

/**
 * Run an external write idempotently.
 * @param {object} entry - worklog_entry row
 * @param {'jira'|'sheet'|'gmail'} system
 * @param {() => Promise<string>} doWrite - performs the side-effect; returns the external_id
 */
async function syncOne(entry, system, doWrite) {
  let row = Q.getExternalWrite(entry.id, system);

  if (row && row.status === 'synced') return row; // already done — skip

  if (!row) {
    row = Q.insertExternalWrite({
      worklog_entry_id: entry.id,
      user_id: entry.user_id,
      work_date: entry.work_date,
      system,
    });
  }

  try {
    const externalId = await doWrite();
    Q.markExternalWriteSynced(row.id, externalId);
  } catch (e) {
    Q.markExternalWriteFailed(row.id, String(e?.message || e));
  }
  return Q.getExternalWrite(entry.id, system);
}

/** Aggregate the day's external_writes into a per-system result for the response. */
function buildResult(userId, workDate) {
  const rows = Q.getExternalWritesForDay(userId, workDate);

  const result = {
    jira:    { ok: 0, failed: 0, worklog_ids: [] },
    sheet:   { ok: false, rows_appended: 0 },
    gmail:   { ok: false, draft_id: null },
    overall: 'ok',
  };

  for (const r of rows) {
    if (r.system === 'jira') {
      if (r.status === 'synced') { result.jira.ok++; if (r.external_id) result.jira.worklog_ids.push(r.external_id); }
      else if (r.status === 'failed') result.jira.failed++;
    } else if (r.system === 'sheet') {
      if (r.status === 'synced') { result.sheet.ok = true; result.sheet.rows_appended++; }
    } else if (r.system === 'gmail') {
      if (r.status === 'synced') { result.gmail.ok = true; result.gmail.draft_id = r.external_id; }
    }
  }

  const anyFailed = rows.some(r => r.status === 'failed');
  const anyOk     = rows.some(r => r.status === 'synced');
  result.overall  = anyFailed ? (anyOk ? 'partial' : 'failed') : 'ok';
  return result;
}

module.exports = { syncOne, buildResult, SYSTEMS };
