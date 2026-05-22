// jiraOAuth.js — Atlassian OAuth 2.0 (3LO) per-user connect. M1 / pilot.
// See DevDoc §6.5. Rotating refresh tokens MUST be overwritten in the same
// transaction as the new access token, or pilot users lose Jira access.
// M0 uses a single demo classic token via env vars instead.

// TODO(M1): Implement the full 3LO flow:
//   1) startConnect(req,res) → 302 to https://auth.atlassian.com/authorize?...
//   2) handleCallback(req,res) → POST /oauth/token, then store encrypted in user_connections
//   3) getActiveToken(userId) → returns decrypted access_token; refreshes if needed
//   4) refreshToken(userId) → atomic overwrite of refresh_token + access_token

module.exports = {
  startConnect: (_req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Jira OAuth is an M1 task — DevDoc §6.5' } }),
  handleCallback: (_req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Jira OAuth callback — M1' } }),
};
