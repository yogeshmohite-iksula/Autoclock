// sheets.js — Append a row to the user's Google Sheet timesheet (DevDoc §6.3).
// Per-user sheet_id + sheet_range live on users (TB-01). M0 uses one demo user.

const { google } = require('googleapis');
const { db } = require('../db');

function makeAuth() {
  // M0: use the demo refresh token captured before HackFest (Work Plan P-4).
  // M1: use the decrypted per-user google access_token from user_connections.
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_DEMO_REFRESH_TOKEN });
  return oauth2;
}

const HEADERS = ['Date', 'Employee', 'Project', 'Ticket', 'Slot', 'Duration', 'Description'];

function currentMonthTab() {
  const d = new Date();
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

async function ensureTab(sheets, spreadsheetId, tab) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const exists = meta.data.sheets.some(s => s.properties.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
  }
}

async function ensureHeaders(sheets, spreadsheetId, tab) {
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:G1`,
  });
  const firstRow = check.data.values?.[0];
  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] },
    });
  }
}

/**
 * Append one row to the calling user's timesheet.
 * Row is built here from structured args so callers stay clean.
 * @param {{id:number, name:string}} user
 * @param {{date:string, slot:string, duration:string, ticket:string, description:string}} data
 * @returns {Promise<string>} the updated A1 range — used as external_id.
 */
async function appendRow(user, data) {
  const userRow = db.prepare('SELECT sheet_id, name FROM users WHERE id = ?').get(user.id);
  const spreadsheetId = userRow?.sheet_id || process.env.GOOGLE_DEMO_SHEET_ID;
  if (!spreadsheetId) throw new Error('No sheet_id on user (TB-01) and GOOGLE_DEMO_SHEET_ID not set');

  // Tab = current month, e.g. "May 2026". Creates the tab if missing via append (Sheets API does this automatically).
  const tab = currentMonthTab();
  const range = `${tab}!A:G`;

  const auth = makeAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await ensureTab(sheets, spreadsheetId, tab);
  await ensureHeaders(sheets, spreadsheetId, tab);

  const employeeName = userRow?.name || user.name || user.email;
  const row = [data.date, employeeName, data.project, data.ticket, data.slot, data.duration, data.description];

  const resp = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  return resp.data?.updates?.updatedRange || `${range}@${Date.now()}`;
}

module.exports = { appendRow };
