// routes/dashboard.js — EP-14 (PM/Lead team) + EP-15 (Management org).

const express = require('express');
const { db } = require('../db');
const { requireRole } = require('../auth/rbac');

const router = express.Router();

// EP-14 GET /api/dashboard/team — PM/Lead team metrics (scoped to their team)
router.get('/team', requireRole('pm_lead', 'admin'), (req, res) => {
  const teamId = req.user.team_id;
  if (!teamId) return res.json({ kpis: {}, by_ticket: [], not_logged_today: [], members: [] });

  const today = new Date().toISOString().slice(0, 10);
  const kpis = {
    team_logged_today: db.prepare(`
      SELECT COUNT(DISTINCT user_id) AS n
      FROM worklog_entries
      WHERE work_date = ? AND user_id IN (SELECT id FROM users WHERE team_id = ?)
    `).get(today, teamId).n,
  };

  const by_ticket = db.prepare(`
    SELECT t.jira_key, SUM(e.duration_minutes) AS minutes
    FROM worklog_entries e
    JOIN jira_tasks t ON t.id = e.jira_task_id
    WHERE e.work_date = ? AND e.user_id IN (SELECT id FROM users WHERE team_id = ?)
    GROUP BY t.jira_key
    ORDER BY minutes DESC
  `).all(today, teamId);

  const not_logged_today = db.prepare(`
    SELECT u.id, u.name FROM users u
    WHERE u.team_id = ? AND u.is_active = 1
      AND u.id NOT IN (SELECT DISTINCT user_id FROM worklog_entries WHERE work_date = ?)
  `).all(teamId, today);

  const members = db.prepare(`
    SELECT u.id, u.name, COALESCE(SUM(e.duration_minutes), 0) AS minutes_today
    FROM users u
    LEFT JOIN worklog_entries e ON e.user_id = u.id AND e.work_date = ?
    WHERE u.team_id = ? AND u.is_active = 1
    GROUP BY u.id
  `).all(today, teamId);

  res.json({ team_id: teamId, kpis, by_ticket, not_logged_today, members });
});

// EP-15 GET /api/dashboard/org — Management org metrics (M1)
router.get('/org', requireRole('management', 'admin'), (_req, res) => {
  // M1: org-wide utilization, multi-week trends, project portfolio.
  // For M0, return seeded shape so the UI can render.
  res.json({
    kpis: { workforce_logged_today: 0, org_compliance_pct: 0, org_utilization_pct: 0, active_projects: 0 },
    project_portfolio: [],
    team_comparison: [],
    trend_weeks: [],
  });
});

module.exports = router;
