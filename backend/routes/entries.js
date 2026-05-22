// routes/entries.js — EP-08..EP-11 (worklog entry CRUD).
// FR-01 (create/edit/delete), FR-18 (IST timezone).
//
// Parser interface consumed (services/parser.js — owned by Yogesh):
//   parseDuration(raw)         string  → integer minutes
//   tidy(desc)                 string  → normalised description
//   validateEntry(entry)       entry   → string[] of field errors
//   validateDay(entries[])     array   → { errors, warnings, total_minutes }

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');
const { parseDuration, tidy, validateEntry, validateDay } = require('../services/parser');

const router = express.Router();
const employees = requireRole('employee', 'pm_lead', 'management', 'operations', 'admin');

// IST = UTC+5:30. Used for default work_date so a user logging at 23:30 IST
// doesn't accidentally land on tomorrow's UTC date.
function istToday() {
  return new Date(Date.now() + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function validateFormats(work_date, slot_start, slot_end) {
  const errs = [];
  if (!DATE_RE.test(work_date))  errs.push('work_date must be YYYY-MM-DD');
  if (!TIME_RE.test(slot_start)) errs.push('slot_start must be HH:MM');
  if (!TIME_RE.test(slot_end))   errs.push('slot_end must be HH:MM');
  return errs;
}

// Load the day's entries and check day-level rules:
//   - over 24h total → { over24: true }
//   - slot overlaps  → { warnings: [...] }
// excludeId: the entry being edited — remove it before combining.
function checkDay(userId, workDate, proposed, excludeId = null) {
  let existing = Q.getEntriesForDay(userId, workDate);
  if (excludeId != null) existing = existing.filter(e => e.id !== excludeId);
  const { errors, warnings } = validateDay([...existing, { ...proposed, id: null }]);
  const over24 = errors.some(e => e.entry_id === null && e.errs.some(x => x.includes('24h')));
  return { over24, warnings };
}

// ── EP-08 GET /api/entries?date=YYYY-MM-DD ───────────────────────────────────
// Returns the calling user's entries for that date.
// All times are in IST (_tz: 'IST'). Conversion to UTC happens at Jira-write
// time via parser.toJiraStarted (appends +0530 offset).
router.get('/', employees, (req, res) => {
  const date = req.query.date || istToday();
  res.json({ entries: Q.getEntriesForDay(req.user.id, date), _tz: 'IST' });
});

// ── EP-09 POST /api/entries ──────────────────────────────────────────────────
router.post('/', employees, (req, res) => {
  const b = req.body || {};
  const work_date  = String(b.work_date  || istToday());
  const slot_start = String(b.slot_start || '');
  const slot_end   = String(b.slot_end   || '');

  const fmtErrs = validateFormats(work_date, slot_start, slot_end);
  if (fmtErrs.length) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: fmtErrs.join('; ') } });
  }

  const duration_minutes = typeof b.duration_minutes === 'number'
    ? Math.round(b.duration_minutes)
    : parseDuration(b.duration_raw);

  const entry = {
    user_id:          req.user.id,
    project_id:       parseInt(b.project_id, 10),
    jira_task_id:     parseInt(b.jira_task_id, 10),
    description:      tidy(String(b.description || '')),
    duration_minutes,
    slot_start,
    slot_end,
    work_date,
  };

  // Single-entry validation (duration > 0, slot order, required fields)
  const errs = validateEntry(entry);
  if (errs.length) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });
  }

  // FK: jira_task_id must belong to project_id (FR-02)
  const task = Q.getTaskById(entry.jira_task_id);
  if (!task || task.project_id !== entry.project_id) {
    return res.status(400).json({ error: { code: 'INVALID_TASK', message: 'jira_task_id does not belong to project_id' } });
  }

  // Day-level: block if total would exceed 24h; surface overlap warnings
  const { over24, warnings } = checkDay(req.user.id, work_date, entry);
  if (over24) {
    return res.status(400).json({ error: { code: 'OVER_24H', message: 'Adding this entry would exceed 24 hours for the day' } });
  }

  const created = Q.createEntry(entry);
  res.status(201).json({ entry: created, warnings, _tz: 'IST' });
});

// ── EP-10 PUT /api/entries/:id ───────────────────────────────────────────────
router.put('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'id must be integer' } });
  }

  const existing = Q.getEntryById(id);
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  }
  if (existing.status === 'synced') {
    return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot edit' } });
  }

  const b = req.body || {};
  const work_date  = String(b.work_date  !== undefined ? b.work_date  : existing.work_date);
  const slot_start = String(b.slot_start !== undefined ? b.slot_start : existing.slot_start);
  const slot_end   = String(b.slot_end   !== undefined ? b.slot_end   : existing.slot_end);

  const fmtErrs = validateFormats(work_date, slot_start, slot_end);
  if (fmtErrs.length) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: fmtErrs.join('; ') } });
  }

  const project_id   = b.project_id   !== undefined ? parseInt(b.project_id, 10)   : existing.project_id;
  const jira_task_id = b.jira_task_id !== undefined ? parseInt(b.jira_task_id, 10) : existing.jira_task_id;
  const duration_minutes = typeof b.duration_minutes === 'number'
    ? Math.round(b.duration_minutes)
    : (b.duration_raw ? parseDuration(b.duration_raw) : existing.duration_minutes);

  const patched = {
    project_id,
    jira_task_id,
    description:      tidy(String(b.description !== undefined ? b.description : existing.description)),
    duration_minutes,
    slot_start,
    slot_end,
    work_date,
  };

  const errs = validateEntry(patched);
  if (errs.length) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });
  }

  const task = Q.getTaskById(patched.jira_task_id);
  if (!task || task.project_id !== patched.project_id) {
    return res.status(400).json({ error: { code: 'INVALID_TASK', message: 'jira_task_id does not belong to project_id' } });
  }

  const { over24, warnings } = checkDay(req.user.id, work_date, patched, id);
  if (over24) {
    return res.status(400).json({ error: { code: 'OVER_24H', message: 'Editing this entry would exceed 24 hours for the day' } });
  }

  const updated = Q.updateEntry(id, patched);
  res.json({ entry: updated, warnings, _tz: 'IST' });
});

// ── EP-11 DELETE /api/entries/:id ────────────────────────────────────────────
router.delete('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = Q.getEntryById(id);
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  }
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  }
  if (existing.status === 'synced') {
    return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot delete' } });
  }
  Q.deleteEntry(id);
  res.json({ ok: true });
});

module.exports = router;
