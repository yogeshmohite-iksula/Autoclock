// routes/day.js — EP-12 (preview) + EP-13 (idempotent Close My Day sync).
// See PRD §7 Flow B, ERD §6 example, DevDoc §6.8 idempotency.

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');
const { groupByTicket, validateDay, toJiraStarted } = require('../services/parser');
const { syncOne, buildResult } = require('../services/sync');
const jiraSvc = require('../services/jira');
const sheetsSvc = require('../services/sheets');
const gmailSvc = require('../services/gmail');

const router = express.Router();
const employees = requireRole('employee', 'pm_lead', 'management', 'operations', 'admin');

// EP-12 POST /api/day/preview — parse + group → preview payload
router.post('/preview', employees, (req, res) => {
  const work_date = req.body?.work_date || new Date().toISOString().slice(0, 10);
  const entries = Q.getEntriesForDay(req.user.id, work_date);
  const { errors, warnings, total_minutes } = validateDay(entries);
  const groups = groupByTicket(entries);
  res.json({ work_date, groups, total_minutes, warnings, errors });
});

// EP-13 POST /api/day/close — IDEMPOTENT sync (ADR-09). Keyed on (user_id, work_date).
router.post('/close', employees, async (req, res, next) => {
  try {
    const work_date = req.body?.work_date;
    if (!work_date) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'work_date required' } });
    if (!req.body?.confirmed) return res.status(400).json({ error: { code: 'NOT_CONFIRMED', message: 'must call /api/day/preview and confirm first (FR-04)' } });

    const entries = Q.getEntriesForDay(req.user.id, work_date);
    const { errors } = validateDay(entries);
    if (errors.length) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Entries invalid — see errors', errors } });

    // 1. Jira write — one worklog per entry, attributed to the user's token (ADR-01).
    for (const e of entries) {
      await syncOne(e, 'jira', async () => {
        const startedIso = toJiraStarted(e.work_date, e.slot_start);
        return await jiraSvc.createWorklog(req.user, e.jira_key, e.duration_minutes, e.description, startedIso);
      });
    }

    // 2. Sheet append — one row per ticket group (ERD §14.3 row-per-ticket).
    const groups = groupByTicket(entries);
    for (const group of groups) {
      const anchor = entries.find(e => e.jira_key === group.jira_key);
      if (!anchor) continue;
      await syncOne(anchor, 'sheet', async () => {
        return await sheetsSvc.appendRow(req.user, [
          `${anchor.slot_start}-${anchor.slot_end}`,
          `${Math.floor(group.minutes / 60)}h ${group.minutes % 60}m`,
          `${group.jira_key}: ${group.lines.join('; ')}`,
        ]);
      });
    }

    // 3. Gmail draft — one per day.
    if (entries.length > 0) {
      const anchor = entries[0];
      await syncOne(anchor, 'gmail', async () => {
        const subject = `EOD ${work_date} — ${req.user.email}`;
        return await gmailSvc.createDraftFromGroups(req.user, subject, groups);
      });
    }

    res.json(buildResult(req.user.id, work_date));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
