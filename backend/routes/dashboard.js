// routes/dashboard.js — EP-14 (PM/Lead team) + EP-15 (Management org).

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();

// EP-14 GET /api/dashboard/team — PM/Lead team metrics (scoped to their team)
router.get('/team', requireRole('pm_lead', 'admin'), (req, res) => {
  const teamId = req.user.team_id;
  if (!teamId) return res.json({ kpis: {}, by_ticket: [], not_logged_today: [], members: [] });

  const today = new Date().toISOString().slice(0, 10);
  res.json({
    team_id:         teamId,
    kpis:            { team_logged_today: Q.getTeamLoggedTodayCount(teamId, today) },
    by_ticket:       Q.getByTicketForTeamToday(teamId, today),
    not_logged_today: Q.getUsersNotLoggedToday(teamId, today),
    members:         Q.getTeamMembersWithMinutesToday(teamId, today),
  });
});

// EP-15 GET /api/dashboard/org — Management org metrics (M1)
router.get('/org', requireRole('management', 'admin'), (_req, res) => {
  // M1: org-wide utilization, multi-week trends, project portfolio.
  // For M0, return seeded shape so the UI can render.
  res.json({
    kpis: { workforce_logged_today: 0, org_compliance_pct: 0, org_utilization_pct: 0, active_projects: 0 },
    project_portfolio: [],
    team_comparison:   [],
    trend_weeks:       [],
  });
});

module.exports = router;
