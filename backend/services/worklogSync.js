// worklogSync.js — read ALL Jira worklogs via the Browse-Projects reader account (FR-21).
// DevDoc §6.7, ADR-08. Used by EP-23 and the Operations / Management dashboards.
// Two-step pull:
//   1) GET /rest/api/3/worklog/updated?since={ms}  → paginate until lastPage=true
//   2) POST /rest/api/3/worklog/list (max 1000 IDs per batch) → full worklog objects
// Returns raw worklog objects; the caller aggregates by authorAccountId / day / week.

const { JiraApiError } = require('./jira');

function readerBase() {
  if (process.env.JIRA_CLOUD_ID)
    return `https://api.atlassian.com/ex/jira/${process.env.JIRA_CLOUD_ID}`;
  if (process.env.JIRA_BASE_URL) return process.env.JIRA_BASE_URL;
  throw new JiraApiError(0, 'JIRA_BASE_URL or JIRA_CLOUD_ID env not set');
}

function readerAuth() {
  const email = process.env.JIRA_READER_EMAIL;
  const token = process.env.JIRA_READER_TOKEN;
  if (!email || !token) throw new JiraApiError(0, 'JIRA_READER_EMAIL / JIRA_READER_TOKEN env not set');
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

async function checkResponse(res) {
  if (res.status === 403) throw new JiraApiError(403, 'Reader account lacks Browse Projects permission');
  if (res.status === 429) throw new JiraApiError(429, 'Jira rate-limited reader account');
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new JiraApiError(res.status, body);
  }
}

/**
 * Pull all Jira worklogs updated since the given Unix timestamp (milliseconds).
 * @param {number} sinceUnixMillis  - e.g. Date.parse('2026-03-01')
 * @param {object} [opts]           - { fetch } for test injection only
 * @returns {Promise<Array>}        - array of raw Jira worklog objects
 */
async function pullSince(sinceUnixMillis, { fetch: fetchFn = globalThis.fetch } = {}) {
  const base = readerBase();
  const auth = readerAuth();
  const headers = { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' };

  // ── Step 1: collect all worklog IDs updated since the timestamp ─────────────
  const ids = [];
  let since = sinceUnixMillis;
  let lastPage = false;

  while (!lastPage) {
    const res = await fetchFn(`${base}/rest/api/3/worklog/updated?since=${since}`, { headers });
    await checkResponse(res);
    const json = await res.json();
    for (const v of json.values || []) ids.push(v.worklogId);
    lastPage = json.lastPage === true;
    since = json.until ?? since; // advance cursor for next page
  }

  if (ids.length === 0) return [];

  // ── Step 2: fetch full worklog objects in batches of 1000 ────────────────────
  const worklogs = [];
  const BATCH = 1000;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const res = await fetchFn(`${base}/rest/api/3/worklog/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: batch }),
    });
    await checkResponse(res);
    const json = await res.json();
    worklogs.push(...(Array.isArray(json) ? json : []));
  }

  return worklogs;
}

module.exports = { pullSince };
