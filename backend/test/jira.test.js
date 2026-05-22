// jira.test.js — unit tests for services/jira.js and services/worklogSync.js.
// All network calls are injected via the { fetch } option — no real Jira traffic.
// Node 18 built-in runner. No extra deps.

// Speed up retry tests: override setTimeout before requiring the module so the
// backoff delays in withRetry() resolve immediately.
const realSetTimeout = global.setTimeout;
global.setTimeout = (fn, _ms) => realSetTimeout(fn, 0);

process.env.TOKEN_ENC_KEY   = '0'.repeat(64);
process.env.SESSION_SECRET  = 'test-secret-do-not-use-in-prod';
process.env.ENABLE_CRON     = 'false';
process.env.JIRA_BASE_URL   = 'https://test.atlassian.net';
process.env.JIRA_EMAIL      = 'demo@iksula.com';
process.env.JIRA_API_TOKEN  = 'fake-classic-token';
process.env.JIRA_READER_EMAIL = 'reader@iksula.com';
process.env.JIRA_READER_TOKEN = 'fake-reader-token';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { createWorklog, JiraForbiddenError, JiraRateLimitError, JiraApiError } = require('../services/jira');
const { pullSince } = require('../services/worklogSync');

// ── mock fetch helpers ────────────────────────────────────────────────────────

function mockFetch(status, body) {
  return async (_url, _opts) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
    statusText: String(status),
  });
}

// Returns a mock that cycles through the given responses in order.
function mockFetchSequence(...responses) {
  let i = 0;
  return async (url, opts) => {
    const r = responses[Math.min(i++, responses.length - 1)];
    return r(url, opts);
  };
}

const VALID_ARGS = [
  { id: 1, email: 'demo@iksula.com' }, // user
  'PIM-3073',                           // jiraKey
  90,                                   // minutes
  'Test cases for PIM-3073',            // description
  '2026-05-23T10:00:00.000+0530',       // startedIso
];

// ── createWorklog ─────────────────────────────────────────────────────────────

test('createWorklog: 201 → returns worklog id string', async () => {
  const id = await createWorklog(...VALID_ARGS, { fetch: mockFetch(201, { id: 'wl-001' }) });
  assert.equal(id, 'wl-001');
});

test('createWorklog: 403 → throws JiraForbiddenError (not JiraRateLimitError)', async () => {
  await assert.rejects(
    () => createWorklog(...VALID_ARGS, { fetch: mockFetch(403, {}) }),
    (e) => {
      assert.equal(e.name, 'JiraForbiddenError');
      assert.ok(e.message.includes('PIM-3073'), 'message includes the jira key');
      assert.ok(e.message.includes('ask your lead'), 'message includes guidance');
      return true;
    }
  );
});

test('createWorklog: 429 × 1 then 201 → succeeds after retry', async () => {
  const fetch = mockFetchSequence(
    mockFetch(429, {}),
    mockFetch(201, { id: 'wl-retry-001' })
  );
  const id = await createWorklog(...VALID_ARGS, { fetch });
  assert.equal(id, 'wl-retry-001');
});

test('createWorklog: 429 × maxAttempts → throws JiraRateLimitError', async () => {
  await assert.rejects(
    () => createWorklog(...VALID_ARGS, { fetch: mockFetch(429, {}) }),
    (e) => {
      assert.equal(e.name, 'JiraRateLimitError');
      assert.ok(e.message.includes('PIM-3073'));
      return true;
    }
  );
});

test('createWorklog: 500 → throws JiraApiError with status', async () => {
  await assert.rejects(
    () => createWorklog(...VALID_ARGS, { fetch: mockFetch(500, { message: 'internal error' }) }),
    (e) => {
      assert.equal(e.name, 'JiraApiError');
      assert.equal(e.status, 500);
      return true;
    }
  );
});

test('createWorklog: auth header is Basic + base64(email:token)', async () => {
  let capturedAuth;
  const spyFetch = async (url, opts) => {
    capturedAuth = opts.headers.Authorization;
    return { status: 201, ok: true, json: async () => ({ id: 'wl-spy' }), text: async () => '' };
  };
  await createWorklog(...VALID_ARGS, { fetch: spyFetch });
  assert.ok(capturedAuth.startsWith('Basic '), 'must start with Basic');
  const decoded = Buffer.from(capturedAuth.slice(6), 'base64').toString();
  assert.ok(decoded.includes(':'), 'must be email:token');
});

test('createWorklog: URL contains the jiraKey in the path', async () => {
  let capturedUrl;
  const spyFetch = async (url, _opts) => {
    capturedUrl = url;
    return { status: 201, ok: true, json: async () => ({ id: 'wl-url' }), text: async () => '' };
  };
  await createWorklog(...VALID_ARGS, { fetch: spyFetch });
  assert.ok(capturedUrl.includes('PIM-3073'), 'URL must contain the jira key');
  assert.ok(capturedUrl.endsWith('/worklog'), 'URL must end with /worklog');
});

// ── pullSince ─────────────────────────────────────────────────────────────────

test('pullSince: two-page pagination collects all IDs and fetches details', async () => {
  const capturedListBodies = [];

  const spyFetch = async (url, opts) => {
    if (url.includes('/worklog/updated')) {
      // Simulate two pages
      const since = new URL(url).searchParams.get('since');
      if (since === '0') {
        return { status: 200, ok: true, text: async () => '', json: async () => ({
          values: [{ worklogId: 1 }, { worklogId: 2 }, { worklogId: 3 }],
          lastPage: false, until: 1000,
        }) };
      }
      return { status: 200, ok: true, text: async () => '', json: async () => ({
        values: [{ worklogId: 4 }, { worklogId: 5 }],
        lastPage: true, until: 2000,
      }) };
    }
    if (url.includes('/worklog/list')) {
      capturedListBodies.push(JSON.parse(opts.body));
      return { status: 200, ok: true, text: async () => '', json: async () => [
        { id: 1, authorAccountId: 'u1', timeSpentSeconds: 3600 },
        { id: 2, authorAccountId: 'u2', timeSpentSeconds: 1800 },
        { id: 3, authorAccountId: 'u1', timeSpentSeconds: 900 },
        { id: 4, authorAccountId: 'u3', timeSpentSeconds: 7200 },
        { id: 5, authorAccountId: 'u1', timeSpentSeconds: 1800 },
      ] };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const worklogs = await pullSince(0, { fetch: spyFetch });
  assert.equal(worklogs.length, 5, 'should return all 5 worklog objects');
  // All 5 IDs were passed to worklog/list in one batch
  assert.equal(capturedListBodies.length, 1, 'should call worklog/list once for ≤1000 IDs');
  assert.deepEqual(capturedListBodies[0].ids, [1, 2, 3, 4, 5], 'all IDs sent to list endpoint');
});

test('pullSince: empty history (lastPage on first call) → returns []', async () => {
  const fetch = async (url) => {
    if (url.includes('/worklog/updated')) {
      return { status: 200, ok: true, text: async () => '', json: async () => ({ values: [], lastPage: true, until: 0 }) };
    }
    throw new Error('worklog/list should not be called when there are no IDs');
  };
  const worklogs = await pullSince(0, { fetch });
  assert.deepEqual(worklogs, []);
});

test('pullSince: 403 from reader account → throws JiraApiError', async () => {
  await assert.rejects(
    () => pullSince(0, { fetch: mockFetch(403, {}) }),
    (e) => {
      assert.equal(e.name, 'JiraApiError');
      assert.equal(e.status, 403);
      return true;
    }
  );
});
