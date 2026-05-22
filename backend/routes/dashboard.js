// routes/dashboard.js — EP-14 (PM/Lead team) + EP-15 (Management org).

const express = require('express');
const Q = require('../db/queries');
const { requireRole } = require('../auth/rbac');

const router = express.Router();

function weekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}

// EP-14 GET /api/dashboard/team — PM/Lead team metrics (scoped to their team)
router.get('/team', requireRole('pm_lead', 'admin'), (req, res) => {
  const teamId = req.user.team_id;
  if (!teamId) return res.json({ kpis: {}, by_ticket: [], not_logged_today: [], members: [] });

  const today   = new Date().toISOString().slice(0, 10);
  const members = Q.getTeamMembersWithMinutesToday(teamId, today);
  const totalMinToday = members.reduce((a, m) => a + m.minutes_today, 0);

  res.json({
    team_id:          teamId,
    kpis: {
      team_logged_today: Q.getTeamLoggedTodayCount(teamId, today),
      members_count:     members.length,
      avg_minutes_today: members.length ? Math.round(totalMinToday / members.length) : 0,
    },
    by_ticket:        Q.getByTicketForTeamToday(teamId, today),
    not_logged_today: Q.getUsersNotLoggedToday(teamId, today),
    members,
  });
});

// EP-15 GET /api/dashboard/org — Management org metrics
router.get('/org', requireRole('management', 'admin'), (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { weekStart, weekEnd } = weekBounds(today);

  const allUsers      = Q.getAllActiveUsers().filter(u =>
    ['employee', 'pm_lead', 'management'].includes(u.role));
  const weeklyMinutes = Q.getWeeklyMinutesPerUser(weekStart, weekEnd);
  const totalWeekMin  = weeklyMinutes.reduce((a, r) => a + r.minutes, 0);
  const settings      = Q.getAllSettings();
  const targetMin     = parseInt(settings.weekly_target_hours || '40', 10) * 60;
  const compliedCount = weeklyMinutes.filter(r => r.minutes >= targetMin).length;
  const orgCompliance = allUsers.length
    ? Math.round((compliedCount / allUsers.length) * 100) : 0;

  res.json({
    kpis: {
      workforce_logged_today: Q.getOrgLoggedTodayCount(today),
      org_compliance_pct:     orgCompliance,
      org_utilization_pct:    allUsers.length
        ? Math.round((totalWeekMin / (allUsers.length * targetMin)) * 100) : 0,
      active_projects:        Q.getActiveProjects().length,
    },
    project_portfolio: Q.getByProjectForWeek(weekStart, weekEnd),
    team_comparison:   Q.getTeamComparisonForWeek(weekStart, weekEnd),
    trend_weeks:       Q.getWeeklyTrend(4),
  });
});

module.exports = router;
