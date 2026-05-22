// jobs/compliance.js — Friday/Monday compliance chase via node-cron. M1.

const cron = require('node-cron');

function register() {
  // FR-16: Fri 1 PM IST — chase everyone under target.
  cron.schedule('0 13 * * 5', () => {
    console.log('[cron] Friday compliance check — placeholder (M1)');
    // TODO(M1): compute weekly hours, send reminders, record in reminder_runs.
  }, { timezone: 'Asia/Kolkata' });

  // FR-16: Mon 1 PM IST — re-check.
  cron.schedule('0 13 * * 1', () => {
    console.log('[cron] Monday re-check — placeholder (M1)');
  }, { timezone: 'Asia/Kolkata' });

  console.log('[cron] compliance schedules registered (Fri 1pm IST, Mon 1pm IST)');
}

module.exports = { register };
