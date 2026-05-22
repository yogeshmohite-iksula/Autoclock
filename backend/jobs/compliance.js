// jobs/compliance.js — Friday/Monday compliance chase via node-cron (FR-16).

const cron     = require('node-cron');
const Q        = require('../db/queries');
const notifier = require('../services/notifier');

function weekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

async function runCheck(type, triggeredBy, actorUserId) {
  const today = new Date().toISOString().slice(0, 10);
  const { weekStart, weekEnd } = weekBounds(today);
  const settings  = Q.getAllSettings();
  const targetMin = parseInt(settings.weekly_target_hours || '40', 10) * 60;
  const allUsers  = Q.getAllActiveUsers().filter(u =>
    ['employee', 'pm_lead', 'management'].includes(u.role));

  const weeklyMap = Object.fromEntries(
    Q.getWeeklyMinutesPerUser(weekStart, weekEnd).map(r => [r.user_id, r.minutes])
  );

  // Monday: mark complied users from the last Friday run, then restrict candidates to still-pending.
  let candidates = allUsers;
  if (type === 'monday') {
    const prevPending = Q.getPendingRecipientsFromLastFridayRun();
    for (const p of prevPending) {
      const leaveMin   = (Q.getLeaveDaysForWeek(p.user_id, weekStart, weekEnd).leave_hours || 0) * 60;
      const adjTarget  = Math.max(0, targetMin - leaveMin);
      if ((weeklyMap[p.user_id] || 0) >= adjTarget) {
        Q.updateRecipientResult(p.id, 'complied');
      }
    }
    const stillPending = new Set(
      Q.getPendingRecipientsFromLastFridayRun().map(r => r.user_id)
    );
    candidates = allUsers.filter(u => stillPending.has(u.id));
  }

  // Determine who is under their leave-adjusted target.
  const underTarget = [];
  for (const user of candidates) {
    const leaveMin  = (Q.getLeaveDaysForWeek(user.id, weekStart, weekEnd).leave_hours || 0) * 60;
    const adjTarget = Math.max(0, targetMin - leaveMin);
    const weekMin   = weeklyMap[user.id] || 0;
    if (adjTarget > 0 && weekMin < adjTarget) {
      underTarget.push({ user, weekMin, adjTarget, hoursShort: (adjTarget - weekMin) / 60 });
    }
  }

  const runId = Q.createReminderRun({ run_type: type, triggered_by: triggeredBy, created_by_user_id: actorUserId });

  for (const { user, weekMin, adjTarget, hoursShort } of underTarget) {
    let emailStatus = 'sent';
    try {
      await notifier.sendComplianceReminder(user, weekMin / 60, adjTarget / 60, weekStart);
    } catch (err) {
      emailStatus = 'failed';
      console.error(`[compliance] email failed for ${user.email}:`, err.message);
    }
    Q.insertReminderRecipient({
      reminder_run_id: runId,
      user_id:         user.id,
      week_hours:      +(weekMin / 60).toFixed(2),
      hours_short:     +hoursShort.toFixed(2),
      email_status:    emailStatus,
    });
  }

  Q.updateReminderRunCount(runId, underTarget.length);

  return {
    run_id:           runId,
    type,
    week_start:       weekStart,
    recipients_count: underTarget.length,
    recipients:       underTarget.map(r => ({
      user_id:    r.user.id,
      name:       r.user.name,
      week_hours: +(r.weekMin / 60).toFixed(2),
      hours_short: +r.hoursShort.toFixed(2),
    })),
  };
}

function register() {
  cron.schedule('0 13 * * 5', async () => {
    console.log('[cron] Friday compliance check starting');
    try { await runCheck('friday', 'cron', null); }
    catch (e) { console.error('[cron] Friday check failed:', e.message); }
  }, { timezone: 'Asia/Kolkata' });

  cron.schedule('0 13 * * 1', async () => {
    console.log('[cron] Monday re-check starting');
    try { await runCheck('monday', 'cron', null); }
    catch (e) { console.error('[cron] Monday check failed:', e.message); }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[cron] compliance schedules registered (Fri 1pm IST, Mon 1pm IST)');
}

module.exports = { register, runCheck };
