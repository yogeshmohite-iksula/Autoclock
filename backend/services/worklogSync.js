// worklogSync.js — read ALL Jira worklogs since a date via the reader account.
// DevDoc §6.7. STRETCH goal for HackFest (Hr 12 gate); standard for M1 dashboards.

// TODO(stretch): Implement the two-step pull:
//   1) GET /rest/api/3/worklog/updated?since={ms}  → list of worklog IDs, paginated
//   2) POST /rest/api/3/worklog/list (max 1000 IDs) → full worklog objects
// Then aggregate by author.accountId × day/week, and cache for the dashboards.

module.exports = {
  pullSince: async (_sinceUnixMillis) => {
    throw new Error('worklogSync is a stretch goal — DevDoc §6.7');
  },
};
