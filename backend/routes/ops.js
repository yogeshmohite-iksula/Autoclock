// routes/ops.js — EP-16..EP-18 (Operations compliance) + EP-23 (worklog read-sync, stretch).

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();
const ops = requireRole('operations', 'admin');

// EP-16 GET /api/ops/compliance?week=NN — weekly compliance tracker (M1)
router.get('/compliance', ops, (req, res) => {
  // TODO(M1): compute weekly hours per user, adjusted for leave_days (FR-17).
  const week = req.query.week || isoWeek(new Date());
  const users = Q.getAllActiveUsers();
  res.json({
    week,
    target_hours: 40,
    rows: users.map(u => ({ user_id: u.id, name: u.name, week_hours: 0, hours_short: 40, status: 'pending' })),
  });
});

// EP-17 POST /api/ops/run-check — Run Fri/Mon check (manual trigger) (M1)
router.post('/run-check', ops, (req, res) => {
  const type = req.body?.type;
  if (!['friday', 'monday'].includes(type)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'type must be friday or monday' } });
  }
  // TODO(M1): perform the check + send reminder emails via Gmail.
  const run_id = Q.createReminderRun({ run_type: type, triggered_by: 'manual', created_by_user_id: req.user.id });
  res.json({ run_id, type, recipients: [] });
});

// EP-18 GET /api/ops/reminders — reminder history / email log (M1)
router.get('/reminders', ops, (_req, res) => {
  res.json({ runs: Q.getRecentReminderRuns(50) });
});

// EP-23 POST /api/worklogs/sync — pull all Jira worklogs since a date via reader account (STRETCH)
router.post('/worklogs/sync', ops, (_req, res) => {
  // TODO(stretch): worklogSync.pullSince(since); aggregate; cache for dashboards. See DevDoc §6.7.
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'EP-23 is a stretch goal (Hr 12 gate) — DevDoc §6.7' } });
});

function isoWeek(d) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThu = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return Math.ceil((firstThu - target) / 604800000) + 1;
}

module.exports = router;
