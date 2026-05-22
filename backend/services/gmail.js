// gmail.js — Create the EOD draft in the user's Gmail (DevDoc §6.4).
// Scope: gmail.compose (restricted) — Workspace Internal consent screen exemption.

const { google } = require('googleapis');
const { db } = require('../db');

function makeAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_DEMO_REFRESH_TOKEN });
  return oauth2;
}

function buildMime(to, subject, html) {
  const msg =
    `To: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n${html}`;
  return Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function groupsToHtml(groups) {
  const total = groups.reduce((a, g) => a + g.minutes, 0);
  const rows = groups.map(g =>
    `<tr><td>${escapeHtml(g.jira_key)}</td><td>${Math.floor(g.minutes / 60)}h ${g.minutes % 60}m</td><td>${escapeHtml(g.lines.join('; '))}</td></tr>`
  ).join('');
  return `<html><body><p>EOD report — total ${Math.floor(total / 60)}h ${total % 60}m.</p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>Ticket</th><th>Time</th><th>What I did</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Create an EOD draft. Returns the draft id.
 * @param {{id:number,email:string}} user
 * @param {string} subject
 * @param {Array<{jira_key:string,minutes:number,lines:string[]}>} groups
 */
async function createDraftFromGroups(user, subject, groups) {
  const userRow = db.prepare('SELECT eod_recipient_email, email FROM users WHERE id = ?').get(user.id);
  const to = userRow?.eod_recipient_email || process.env.GOOGLE_DEMO_EOD_TO || userRow?.email || user.email;
  const html = groupsToHtml(groups);
  const raw = buildMime(to, subject, html);

  const auth = makeAuth();
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
  return res.data.id;
}

module.exports = { createDraftFromGroups, buildMime, groupsToHtml };
