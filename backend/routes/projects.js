// routes/projects.js — EP-06, EP-07 (project + dependent Jira-task dropdowns).
// FR-02: selecting a project returns only the Jira tasks scoped to that project.

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();
const anyRole = requireRole('employee', 'pm_lead', 'management', 'operations', 'admin');

// EP-06 GET /api/projects — list active projects (dropdown source)
router.get('/', anyRole, (_req, res) => {
  res.json({ projects: Q.getActiveProjects() });
});

// EP-07 GET /api/projects/:id/tasks — Jira tasks for a project (dependent dropdown).
// M0: returns admin-seeded jira_tasks rows for the chosen project.
// M1: refreshed from live JQL (ERD §14.2).
router.get('/:id/tasks', anyRole, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'project id must be a positive integer' } });
  }
  if (!Q.getProjectById(id)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'project not found' } });
  }
  res.json({ tasks: Q.getTasksByProject(id) });
});

module.exports = router;
