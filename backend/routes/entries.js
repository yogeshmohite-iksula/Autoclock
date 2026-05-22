// routes/entries.js — EP-08..EP-11 (worklog entry CRUD).

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');
const { parseDuration, validateEntry } = require('../services/parser');

const router = express.Router();
const employees = requireRole('employee', 'pm_lead', 'management', 'operations', 'admin');

// EP-08 GET /api/entries?date=YYYY-MM-DD — the day's entries for the calling user
router.get('/', employees, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json({ entries: Q.getEntriesForDay(req.user.id, date) });
});

// EP-09 POST /api/entries — create a work entry
router.post('/', employees, (req, res) => {
  const b = req.body || {};
  const entry = {
    user_id:          req.user.id,
    project_id:       parseInt(b.project_id, 10),
    jira_task_id:     parseInt(b.jira_task_id, 10),
    description:      String(b.description || '').trim(),
    duration_minutes: typeof b.duration_minutes === 'number' ? b.duration_minutes : parseDuration(b.duration_raw),
    slot_start:       String(b.slot_start || ''),
    slot_end:         String(b.slot_end || ''),
    work_date:        String(b.work_date || new Date().toISOString().slice(0, 10)),
  };
  const errs = validateEntry(entry);
  if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });
  res.json({ entry: Q.createEntry(entry) });
});

// EP-10 PUT /api/entries/:id — edit
router.put('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = Q.getEntryById(id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  if (existing.status === 'synced') return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot edit' } });

  const b = req.body || {};
  const patched = { ...existing, ...b };
  patched.duration_minutes = typeof b.duration_minutes === 'number'
    ? b.duration_minutes
    : (b.duration_raw ? parseDuration(b.duration_raw) : existing.duration_minutes);
  const errs = validateEntry(patched);
  if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });

  res.json({ entry: Q.updateEntry(id, patched) });
});

// EP-11 DELETE /api/entries/:id
router.delete('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = Q.getEntryById(id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  if (existing.status === 'synced') return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot delete' } });
  Q.deleteEntry(id);
  res.json({ ok: true });
});

module.exports = router;
