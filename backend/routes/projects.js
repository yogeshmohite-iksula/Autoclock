// routes/projects.js — EP-06, EP-07 (project + dependent Jira-task dropdowns).

const express = require('express');
const { db } = require('../db');
const { requireRole } = require('../auth/rbac');

const router = express.Router();

// EP-06 GET /api/projects — list active projects (dropdown source)
router.get('/', requireRole(...['employee', 'pm_lead', 'management', 'operations', 'admin']), (_req, res) => {
  const rows = db.prepare(`
    SELECT id, name, jira_project_key
    FROM projects
    WHERE is_active = 1
    ORDER BY name
  `).all();
  res.json({ projects: rows });
});

// EP-07 GET /api/projects/:id/tasks — Jira tasks for a project (dependent dropdown)
// M0: returns admin-seeded jira_tasks. M1: refresh from live JQL (ERD §14.2).
router.get('/:id/tasks', requireRole(...['employee', 'pm_lead', 'management', 'operations', 'admin']), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'project id must be integer' } });
  const rows = db.prepare(`
    SELECT id, jira_key, summary
    FROM jira_tasks
    WHERE project_id = ? AND is_active = 1
    ORDER BY jira_key
  `).all(id);
  res.json({ tasks: rows });
});

module.exports = router;
