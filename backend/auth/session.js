// session.js — signed HTTP-only cookie sessions.
// For M0 demo, a single seeded user is auto-logged-in. For M1, replaced by Google OIDC (ADR-10).

const crypto = require('crypto');

const SESSION_COOKIE = 'autoclock_session';
const SECRET = process.env.SESSION_SECRET || 'dev-only-change-me';

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
  catch { return null; }
}

function setSession(res, payload) {
  res.cookie(SESSION_COOKIE, sign(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });
}

function clearSession(res) {
  res.clearCookie(SESSION_COOKIE);
}

// Express middleware — populates req.user
function sessionMiddleware(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = verify(token);
  if (payload) req.user = payload;
  next();
}

function requireSession(req, res, next) {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } });
  next();
}

module.exports = { sign, verify, setSession, clearSession, sessionMiddleware, requireSession, SESSION_COOKIE };
