// routes/entries.js — EP-08..EP-11 (worklog entry CRUD).

const express = require('express');
const { db } = require('../db');
const { requireRole } = require('../auth/rbac');
const { parseDuration, validateEntry } = require('../services/parser');

const router = express.Router();
const employees = requireRole('employee', 'pm_lead', 'management', 'operations', 'admin');

// EP-08 GET /api/entries?date=YYYY-MM-DD — the day's entries for the calling user
router.get('/', employees, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT e.*, t.jira_key, p.name AS project_name
    FROM worklog_entries e
    JOIN jira_tasks t ON t.id = e.jira_task_id
    JOIN projects p ON p.id = e.project_id
    WHERE e.user_id = ? AND e.work_date = ?
    ORDER BY e.slot_start
  `).all(req.user.id, date);
  res.json({ entries: rows });
});

// EP-09 POST /api/entries — create a work entry
router.post('/', employees, (req, res) => {
  const b = req.body || {};
  const entry = {
    user_id: req.user.id,
    project_id: parseInt(b.project_id, 10),
    jira_task_id: parseInt(b.jira_task_id, 10),
    description: String(b.description || '').trim(),
    duration_minutes: typeof b.duration_minutes === 'number' ? b.duration_minutes : parseDuration(b.duration_raw),
    slot_start: String(b.slot_start || ''),
    slot_end: String(b.slot_end || ''),
    work_date: String(b.work_date || new Date().toISOString().slice(0, 10)),
  };
  const errs = validateEntry(entry);
  if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });

  const info = db.prepare(`
    INSERT INTO worklog_entries
      (user_id, project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(entry.user_id, entry.project_id, entry.jira_task_id, entry.description,
         entry.duration_minutes, entry.slot_start, entry.slot_end, entry.work_date);
  const row = db.prepare('SELECT * FROM worklog_entries WHERE id = ?').get(info.lastInsertRowid);
  res.json({ entry: row });
});

// EP-10 PUT /api/entries/:id — edit
router.put('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM worklog_entries WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  if (existing.status === 'synced') return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot edit' } });

  const b = req.body || {};
  const patched = { ...existing, ...b };
  patched.duration_minutes = typeof b.duration_minutes === 'number' ? b.duration_minutes : (b.duration_raw ? parseDuration(b.duration_raw) : existing.duration_minutes);
  const errs = validateEntry(patched);
  if (errs.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errs.join('; ') } });

  db.prepare(`
    UPDATE worklog_entries
    SET project_id=?, jira_task_id=?, description=?, duration_minutes=?, slot_start=?, slot_end=?, work_date=?
    WHERE id = ?
  `).run(patched.project_id, patched.jira_task_id, patched.description,
         patched.duration_minutes, patched.slot_start, patched.slot_end, patched.work_date, id);
  res.json({ entry: db.prepare('SELECT * FROM worklog_entries WHERE id = ?').get(id) });
});

// EP-11 DELETE /api/entries/:id
router.delete('/:id', employees, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM worklog_entries WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'entry not found' } });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'not your entry' } });
  if (existing.status === 'synced') return res.status(409).json({ error: { code: 'IMMUTABLE', message: 'already synced — cannot delete' } });
  db.prepare('DELETE FROM worklog_entries WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
