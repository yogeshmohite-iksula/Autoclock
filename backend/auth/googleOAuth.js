// googleOAuth.js — Google OAuth 2.0 per-user connect for Sheets + Gmail. M1.
// See DevDoc §6.3/§6.4. M0 uses GOOGLE_DEMO_REFRESH_TOKEN for the single demo user.
// Consent screen MUST be set to "Internal" in the Workspace org to use
// the gmail.compose restricted scope without Google verification (DevDoc §6.4).

// TODO(M1): full per-user 3LO + token rotation.

module.exports = {
  startConnect: (_req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Google OAuth is an M1 task — DevDoc §6.5' } }),
  handleCallback: (_req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Google OAuth callback — M1' } }),
};
