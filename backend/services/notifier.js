// notifier.js — Compliance reminder emails (FR-16).
// Uses nodemailer with Gmail OAuth2. Requires gmail.send scope on GOOGLE_DEMO_REFRESH_TOKEN.
// If credentials are absent, logs a warning and skips — never throws so cron jobs stay reliable.

const nodemailer = require('nodemailer');

function makeTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type:         'OAuth2',
      user:         process.env.GOOGLE_DEMO_EMAIL,
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_DEMO_REFRESH_TOKEN,
    },
  });
}

function buildHtml(user, weekHours, targetHours, weekLabel) {
  const short = (targetHours - weekHours).toFixed(1);
  return `<p>Hi ${user.name},</p>
<p>AutoClock shows you've logged <strong>${weekHours.toFixed(1)}h</strong> this week
(${weekLabel}). Your target is <strong>${targetHours.toFixed(1)}h</strong>
— you are <strong>${short}h short</strong>.</p>
<p>Please log your remaining hours before end of day Friday.</p>
<p style="color:#888;font-size:12px">This reminder was sent automatically by AutoClock.</p>`;
}

async function sendComplianceReminder(user, weekHours, targetHours, weekLabel) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_DEMO_REFRESH_TOKEN) {
    console.warn(`[notifier] SKIP email to ${user.email} — Google credentials not configured`);
    return;
  }
  const transport = makeTransport();
  await transport.sendMail({
    from:    `"AutoClock" <${process.env.GOOGLE_DEMO_EMAIL}>`,
    to:      user.email,
    subject: `AutoClock: ${weekLabel} hours reminder`,
    html:    buildHtml(user, weekHours, targetHours, weekLabel),
  });
}

module.exports = { sendComplianceReminder };
