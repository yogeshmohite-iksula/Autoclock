// routes/auth.js — EP-01..EP-05 (sign-in + per-provider OAuth)
// EP-01 Google OIDC sign-in (ADR-10). EP-02..EP-05 per-user OAuth (M1).

const express = require('express');
const Q = require('../db/queries');
const { setSession, clearSession } = require('../auth/session');
const jiraOAuth = require('../auth/jiraOAuth');
const googleOAuth = require('../auth/googleOAuth');

const router = express.Router();

// EP-01 POST /api/auth/login — Google OIDC (placeholder dev-login for M0)
router.post('/login', (req, res) => {
  // M0 demo: accept { email } and look up the user.
  // M1 will replace this with the OIDC id_token verify flow (ADR-10).
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'email required' } });
  const user = Q.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not found / inactive' } });
  setSession(res, { id: user.id, email: user.email, role: user.role, team_id: user.team_id });
  res.json({ user });
});

// Helper: who am I (M0 convenience)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } });
  res.json({ user: req.user });
});

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// EP-02 GET /api/auth/jira/connect — M1
router.get('/jira/connect', jiraOAuth.startConnect);
// EP-03 GET /api/auth/jira/callback — M1
router.get('/jira/callback', jiraOAuth.handleCallback);
// EP-04 GET /api/auth/google/connect — M1
router.get('/google/connect', googleOAuth.startConnect);
// EP-05 GET /api/auth/google/callback — M1
router.get('/google/callback', googleOAuth.handleCallback);

module.exports = router;
