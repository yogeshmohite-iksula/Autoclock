// jira.js — Jira worklog write (FR-05) and per-item error handling (PRD §9).
// Attribution: the worklog is recorded against the calling token's owner (ADR-01).
// Base URL: classic token → JIRA_BASE_URL; scoped token → api.atlassian.com/ex/jira/{cloudId} (ADR-11).

// ── typed errors (exported so callers can inspect the failure reason) ─────────

class JiraForbiddenError extends Error {
  constructor(jiraKey) {
    super(`No permission to log work on ${jiraKey} — ask your lead for issue access`);
    this.name = 'JiraForbiddenError';
    this.jiraKey = jiraKey;
  }
}

class JiraRateLimitError extends Error {
  constructor(jiraKey) {
    super(`Jira rate-limited on ${jiraKey} — queued for retry`);
    this.name = 'JiraRateLimitError';
    this.jiraKey = jiraKey;
  }
}

class JiraApiError extends Error {
  constructor(status, body) {
    super(`Jira ${status}: ${body}`);
    this.name = 'JiraApiError';
    this.status = status;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function jiraBase() {
  if (process.env.JIRA_CLOUD_ID)
    return `https://api.atlassian.com/ex/jira/${process.env.JIRA_CLOUD_ID}`;
  if (process.env.JIRA_BASE_URL) return process.env.JIRA_BASE_URL;
  throw new JiraApiError(0, 'JIRA_BASE_URL or JIRA_CLOUD_ID env not set');
}

function buildAuth(email, token) {
  if (!email || !token) throw new JiraApiError(0, 'Jira credentials env not set');
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

// Exponential backoff + jitter. Only retries on JiraRateLimitError (429).
// Delays: ~1 s, ~2 s, ~4 s, ~8 s (+ up to 500 ms random jitter each).
async function withRetry(fn, maxAttempts = 4) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try { return await fn(); }
    catch (e) {
      if (e.name !== 'JiraRateLimitError') throw e;
      lastErr = e;
      const ms = (2 ** attempt) * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, ms));
    }
  }
  throw lastErr;
}

// ── createWorklog ─────────────────────────────────────────────────────────────

/**
 * Post a worklog to Jira on behalf of the employee (ADR-01).
 * Returns the Jira worklog id string on success.
 * Throws JiraForbiddenError (403), JiraRateLimitError (429 after retries), or JiraApiError.
 *
 * @param {{id:number, email:string}} user  - the calling employee
 * @param {string}  jiraKey                 - e.g. "PIM-3073"
 * @param {number}  minutes                 - duration in minutes
 * @param {string}  description             - tidy()'d description
 * @param {string}  startedIso              - "YYYY-MM-DDThh:mm:00.000+0530" (IST offset)
 * @param {object}  [opts]                  - { fetch } for test injection only
 */
async function createWorklog(user, jiraKey, minutes, description, startedIso, { fetch: fetchFn = globalThis.fetch } = {}) {
  // M0 demo: Basic auth with the env-configured classic API token.
  // M1: use user_connections access_token for the calling employee (DevDoc §6.5).
  const auth = buildAuth(process.env.JIRA_EMAIL, process.env.JIRA_API_TOKEN);
  const base = jiraBase();

  const doPost = async () => {
    const res = await fetchFn(
      `${base}/rest/api/3/issue/${encodeURIComponent(jiraKey)}/worklog`,
      {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          timeSpentSeconds: minutes * 60,
          started: startedIso,
          comment: {
            type: 'doc', version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
          },
        }),
      }
    );
    if (res.status === 403) throw new JiraForbiddenError(jiraKey);
    if (res.status === 429) throw new JiraRateLimitError(jiraKey);
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new JiraApiError(res.status, body);
    }
    return (await res.json()).id; // Jira worklog id string
  };

  return withRetry(doPost);
}

module.exports = { createWorklog, JiraForbiddenError, JiraRateLimitError, JiraApiError };
