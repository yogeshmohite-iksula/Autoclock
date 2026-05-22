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

/**
 * Append one row to the calling user's timesheet.
 * @param {{id:number}} user
 * @param {Array<string|number>} row - e.g. ["14:30-16:00", "1h 30m", "UOM test cases"]
 * @returns {Promise<string>} the updated A1 range — used as external_id.
 */
async function appendRow(user, row) {
  const userRow = db.prepare('SELECT sheet_id, sheet_range FROM users WHERE id = ?').get(user.id);
  const spreadsheetId = userRow?.sheet_id || process.env.GOOGLE_DEMO_SHEET_ID;
  // Default to a sensible placeholder; pin the REAL value after OQ-3 is resolved.
  const range = userRow?.sheet_range || 'May 2026!A:C';
  if (!spreadsheetId) throw new Error('No sheet_id on user (TB-01) and GOOGLE_DEMO_SHEET_ID not set');

  const auth = makeAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const resp = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  // updates.updatedRange is something like "May 2026!A42:C42" — perfect as the external_id.
  return resp.data?.updates?.updatedRange || `${range}@${Date.now()}`;
}

module.exports = { appendRow };
