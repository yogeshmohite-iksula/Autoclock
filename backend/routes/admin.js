// routes/admin.js — EP-19..EP-22 admin CRUD + EP-21 leave sub-router.

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();
const admin = requireRole('admin');

// EP-19 GET/POST/PUT /api/admin/users — manage users + roles
router.get('/users', admin, (_req, res) => {
  res.json({ users: Q.getAllActiveUsers() });
});

router.post('/users', admin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.role) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name, email, role required' } });
  const user_id = Q.createUser({ name: b.name, email: b.email, role: b.role, team_id: b.team_id || null });
  res.json({ user_id });
});

router.put('/users/:id', admin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  Q.updateUser(id, req.body || {});
  res.json({ ok: true });
});

// EP-20 GET/POST /api/admin/projects — projects + Jira mapping
router.get('/projects', admin, (_req, res) => {
  res.json({ projects: Q.getAllProjectsAdmin() });
});

router.post('/projects', admin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.jira_project_key) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name + jira_project_key required' } });
  const project_id = Q.createProject({ name: b.name, jira_project_key: b.jira_project_key });
  res.json({ project_id });
});

router.put('/projects/:id', admin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b  = req.body || {};
  const changed = Q.updateProject(id, { name: b.name, jira_project_key: b.jira_project_key, is_active: b.is_active });
  if (!changed) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'project not found' } });
  res.json({ ok: true });
});

const SETTING_SECTIONS = ['jira', 'google', 'email', 'reader'];

// EP-22 GET/PUT /api/admin/settings — global settings
router.get('/settings', admin, (_req, res) => {
  res.json({ settings: Q.getAllSettings() });
});

router.put('/settings', admin, (req, res) => {
  const b = req.body || {};
  if (b.section !== undefined) {
    if (!SETTING_SECTIONS.includes(b.section))
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `section must be one of: ${SETTING_SECTIONS.join(', ')}` } });
    if (!b.body || typeof b.body !== 'object' || Array.isArray(b.body))
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'body must be a non-null object' } });
    const namespaced = {};
    for (const [k, v] of Object.entries(b.body)) namespaced[`${b.section}.${k}`] = v;
    Q.upsertSettings(namespaced, req.user.id);
  } else {
    Q.upsertSettings(b, req.user.id);
  }
  res.json({ ok: true, settings: Q.getAllSettings() });
});

// EP-21 leave sub-router (mounted at /api/leave by server.js)
const leaveRouter = express.Router();
const leaveAccess = requireRole('operations', 'admin');

leaveRouter.get('/', leaveAccess, (req, res) => {
  const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  res.json({ leave: userId ? Q.getLeaveDays(userId) : Q.getAllLeaveDays() });
});

leaveRouter.post('/', leaveAccess, (req, res) => {
  const b = req.body || {};
  if (!b.user_id || !b.leave_date || !b.leave_type) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'user_id, leave_date, leave_type required' } });
  const leave_id = Q.upsertLeaveDay({
    user_id:            b.user_id,
    leave_date:         b.leave_date,
    leave_type:         b.leave_type,
    hours:              b.hours || 8,
    created_by_user_id: req.user.id,
  });
  res.json({ leave_id });
});

router.leaveRouter = leaveRouter;
module.exports = router;
module.exports.leaveRouter = leaveRouter;
