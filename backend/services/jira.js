// jira.js — Create a Jira worklog (DevDoc §6.1).
// The worklog is attributed to the calling token's owner (ADR-01).
// Base URL depends on token type (ADR-11): classic → site URL; scoped → api.atlassian.com/ex/jira/{cloudId}.

const JIRA_BASE = process.env.JIRA_CLOUD_ID
  ? `https://api.atlassian.com/ex/jira/${process.env.JIRA_CLOUD_ID}`
  : process.env.JIRA_BASE_URL;

/**
 * Create a Jira worklog. Returns the worklog id string.
 * @param {{id:number,email:string}} user - the calling user (for OAuth lookup in M1)
 * @param {string} jiraKey - e.g. "PIM-3073"
 * @param {number} minutes
 * @param {string} description
 * @param {string} startedIso - "YYYY-MM-DDThh:mm:00.000+0530"
 */
async function createWorklog(_user, jiraKey, minutes, description, startedIso) {
  // M0 demo: Basic auth with the env-configured classic API token.
  // M1: load decrypted user OAuth access_token from user_connections (DevDoc §6.5).
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) throw new Error('JIRA_EMAIL / JIRA_API_TOKEN env not set');
  if (!JIRA_BASE) throw new Error('JIRA_BASE_URL or JIRA_CLOUD_ID required');

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const body = {
    timeSpentSeconds: minutes * 60,
    started: startedIso,
    comment: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
    },
  };

  const res = await fetch(`${JIRA_BASE}/rest/api/3/issue/${encodeURIComponent(jiraKey)}/worklog`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  return json.id;
}

module.exports = { createWorklog };
