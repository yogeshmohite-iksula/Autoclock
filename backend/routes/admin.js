// routes/admin.js — EP-19..EP-22 admin CRUD + EP-21 leave sub-router.

const express = require('express');
const { db } = require('../db');
const { requireRole } = require('../auth/rbac');

const router = express.Router();
const admin = requireRole('admin');

// EP-19 GET/POST/PUT /api/admin/users — manage users + roles
router.get('/users', admin, (_req, res) => {
  const users = db.prepare('SELECT id, name, email, role, team_id, onboarding_status, is_active FROM users ORDER BY name').all();
  res.json({ users });
});

router.post('/users', admin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.role) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name, email, role required' } });
  const info = db.prepare(`
    INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
    VALUES (?, ?, ?, ?, 'invited', 1)
  `).run(b.name, b.email, b.role, b.team_id || null);
  res.json({ user_id: info.lastInsertRowid });
});

router.put('/users/:id', admin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  db.prepare(`
    UPDATE users SET name=COALESCE(?,name), role=COALESCE(?,role), team_id=COALESCE(?,team_id), is_active=COALESCE(?,is_active)
    WHERE id = ?
  `).run(b.name ?? null, b.role ?? null, b.team_id ?? null, typeof b.is_active === 'number' ? b.is_active : null, id);
  res.json({ ok: true });
});

// EP-20 GET/POST /api/admin/projects — projects + Jira mapping
router.get('/projects', admin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY name').all();
  res.json({ projects: rows });
});

router.post('/projects', admin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.jira_project_key) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name + jira_project_key required' } });
  const info = db.prepare(`INSERT INTO projects (name, jira_project_key, is_active) VALUES (?, ?, 1)`).run(b.name, b.jira_project_key);
  res.json({ project_id: info.lastInsertRowid });
});

// EP-22 GET/PUT /api/admin/settings — global settings
router.get('/settings', admin, (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json({ settings: obj });
});

router.put('/settings', admin, (req, res) => {
  const patch = req.body || {};
  const ups = db.prepare(`
    INSERT INTO settings (key, value, updated_by_user_id) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now'), updated_by_user_id=excluded.updated_by_user_id
  `);
  const tx = db.transaction(() => { for (const [k, v] of Object.entries(patch)) ups.run(k, String(v), req.user.id); });
  tx();
  res.json({ ok: true });
});

// EP-21 leave sub-router (mounted at /api/leave by server.js)
const leaveRouter = express.Router();
const leaveAccess = requireRole('operations', 'admin');

leaveRouter.get('/', leaveAccess, (req, res) => {
  const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  const rows = userId
    ? db.prepare('SELECT * FROM leave_days WHERE user_id = ? ORDER BY leave_date DESC').all(userId)
    : db.prepare('SELECT * FROM leave_days ORDER BY leave_date DESC LIMIT 200').all();
  res.json({ leave: rows });
});

leaveRouter.post('/', leaveAccess, (req, res) => {
  const b = req.body || {};
  if (!b.user_id || !b.leave_date || !b.leave_type) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'user_id, leave_date, leave_type required' } });
  const info = db.prepare(`
    INSERT INTO leave_days (user_id, leave_date, leave_type, hours, created_by_user_id) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, leave_date) DO UPDATE SET leave_type=excluded.leave_type, hours=excluded.hours
  `).run(b.user_id, b.leave_date, b.leave_type, b.hours || 8, req.user.id);
  res.json({ leave_id: info.lastInsertRowid });
});

router.leaveRouter = leaveRouter;
module.exports = router;
module.exports.leaveRouter = leaveRouter;
