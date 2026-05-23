// routes/ops.js — EP-16..EP-18 (Operations compliance) + EP-23 (worklog read-sync, stretch).

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();
const ops = requireRole('operations', 'admin');

function weekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

// EP-16 GET /api/ops/compliance?date=YYYY-MM-DD — leave-adjusted weekly compliance tracker
router.get('/compliance', ops, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { weekStart, weekEnd } = weekBounds(date);
  const settings   = Q.getAllSettings();
  const targetMin  = parseInt(settings.weekly_target_hours || '40', 10) * 60;
  const users      = Q.getAllActiveUsers().filter(u =>
    ['employee', 'pm_lead', 'management'].includes(u.role));

  const weeklyMap = Object.fromEntries(
    Q.getWeeklyMinutesPerUser(weekStart, weekEnd).map(r => [r.user_id, r.minutes])
  );

  const rows = users.map(u => {
    const leaveResult = Q.getLeaveDaysForWeek(u.id, weekStart, weekEnd);
    const leaveMin    = (leaveResult.leave_hours || 0) * 60;
    const adjustedMin = Math.max(0, targetMin - leaveMin);
    const weekMin     = weeklyMap[u.id] || 0;
    const hoursShort  = Math.max(0, (adjustedMin - weekMin) / 60);
    const status      = weekMin >= adjustedMin ? 'met' : 'short';
    return {
      user_id:      u.id,
      name:         u.name,
      week_hours:   +(weekMin / 60).toFixed(2),
      target_hours: +(adjustedMin / 60).toFixed(2),
      leave_hours:  +(leaveMin / 60).toFixed(2),
      hours_short:  +hoursShort.toFixed(2),
      status,
    };
  });

  res.json({ week_start: weekStart, week_end: weekEnd, target_hours: targetMin / 60, rows });
});

// EP-17 POST /api/ops/run-check — Run Fri/Mon/manual check
router.post('/run-check', ops, async (req, res, next) => {
  try {
    const { type, recipientIds } = req.body || {};
    if (!['friday', 'monday', 'manual'].includes(type)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'type must be friday, monday, or manual' } });
    }
    if (type === 'manual' && (!Array.isArray(recipientIds) || recipientIds.length === 0)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'manual type requires non-empty recipientIds array' } });
    }
    const { runCheck } = require('../jobs/compliance');
    const result = await runCheck(type, 'manual', req.user.id, { recipientIds });
    res.json(result);
  } catch (e) { next(e); }
});

// EP-18 GET /api/ops/reminders — reminder history / email log (enriched with recipients)
router.get('/reminders', ops, (_req, res) => {
  const runs = Q.getRecentReminderRuns(50).map(run => {
    const recipients = Q.getRecipientsForRun(run.id);
    return {
      ...run,
      emailed:    recipients.filter(r => r.email_status === 'sent').length,
      complied:   recipients.filter(r => r.result === 'complied').length,
      recipients,
    };
  });
  res.json({ runs });
});

// EP-23 POST /api/worklogs/sync — mounted separately at /api/worklogs in server.js (ERD §6)
const worklogsRouter = express.Router();
worklogsRouter.post('/sync', ops, (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'EP-23 is a stretch goal (Hr 12 gate) — DevDoc §6.7' } });
});

module.exports = router;
module.exports.worklogsRouter = worklogsRouter;
