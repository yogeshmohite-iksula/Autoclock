// server.js — AutoClock Express entry.
// Self-hosted on an Iksula internal server with PM2 (ADR-03). Never serverless.

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { init: initDb } = require('./db');
const { sessionMiddleware } = require('./auth/session');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Bootstrapping ---
initDb();

// --- Global middleware ---
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Security headers — set before any route handler runs.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Request logger — fires after the response is sent (no latency cost on the hot path).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`)
  );
  next();
});

app.use(sessionMiddleware);

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// --- Routes (EP-01..EP-23) ---
app.use('/api/auth', require('./routes/auth'));        // EP-01..EP-05
app.use('/api/projects', require('./routes/projects')); // EP-06, EP-07
app.use('/api/entries', require('./routes/entries'));   // EP-08..EP-11
app.use('/api/day', require('./routes/day'));           // EP-12, EP-13
app.use('/api/dashboard', require('./routes/dashboard')); // EP-14, EP-15
app.use('/api/ops', require('./routes/ops'));               // EP-16..EP-18
app.use('/api/worklogs', require('./routes/ops').worklogsRouter); // EP-23
app.use('/api/admin', require('./routes/admin'));           // EP-19..EP-22
app.use('/api/leave', require('./routes/admin').leaveRouter); // EP-21 sub-router

// --- JSON 404 for any unmatched /api/* path (must come after all API mounts) ---
app.use('/api', (_req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } })
);

// --- Static web app (production build) ---
const WEB_DIST = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(WEB_DIST));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));

// --- Error handler (last) ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: { code: err.code || 'INTERNAL', message: err.message || 'Server error' } });
});

// --- Boot ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[autoclock] listening on :${PORT}`);
  });
}

module.exports = app;

// --- Schedulers (cron) — registered when running as a process ---
if (require.main === module && process.env.ENABLE_CRON !== 'false') {
  require('./jobs/compliance').register();
}
