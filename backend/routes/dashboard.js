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
  if (!teamId) return res.json({
    team: null, range: 'week',
    kpis: { hoursLogged: 0, onTrack: 0, behind: 0, onLeave: 0, teamSize: 0 },
    by_ticket: [], not_logged_today: [], members: [],
  });

  const today  = new Date().toISOString().slice(0, 10);
  const range  = req.query.range || 'week';
  const { weekStart, weekEnd } = weekBounds(today);

  const team      = Q.getAllTeams().find(t => t.id === teamId) || { name: '' };
  const settings  = Q.getAllSettings();
  const targetMin = parseInt(settings.weekly_target_hours || '40', 10) * 60;

  const members   = Q.getTeamMembersWithMinutesToday(teamId, today);
  const weeklyMap = Object.fromEntries(
    Q.getWeeklyMinutesPerUser(weekStart, weekEnd).map(r => [r.user_id, r.minutes])
  );
  const closedSet = new Set(Q.getTeamEodToday(teamId, today).map(r => r.user_id));

  const enriched = members.map(m => {
    const leaveToday = Q.getLeaveDaysForWeek(m.id, today, today).leave_hours || 0;
    let status;
    if (leaveToday > 0)             status = 'leave';
    else if (m.minutes_today === 0) status = 'missing';
    else if (closedSet.has(m.id))   status = 'closed';
    else                            status = 'logging';

    return {
      id:         m.id,
      name:       m.name,
      role:       m.role,
      hue:        m.id % 8,
      initial:    m.name.charAt(0).toUpperCase(),
      today:      m.minutes_today,
      week:       weeklyMap[m.id] || 0,
      target:     targetMin,
      weekTarget: targetMin,
      status,
      lastClose:  Q.getLastCloseForUser(m.id)?.work_date || null,
    };
  });

  const hoursLogged = Math.round(enriched.reduce((a, m) => a + m.week, 0) / 60);
  const onLeave  = enriched.filter(m => m.status === 'leave').length;
  const onTrack  = enriched.filter(m => m.status !== 'leave' && m.week >= m.weekTarget).length;
  const behind   = enriched.filter(m => m.status !== 'leave' && m.week < m.weekTarget).length;

  res.json({
    team:   { id: teamId, name: team.name },
    range,
    kpis:   { hoursLogged, onTrack, behind, onLeave, teamSize: enriched.length },
    by_ticket:        Q.getByTicketForTeamToday(teamId, today),
    not_logged_today: Q.getUsersNotLoggedToday(teamId, today),
    members:          enriched,
  });
});

// EP-15 GET /api/dashboard/org — Management org metrics
router.get('/org', requireRole('management', 'admin'), (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const range = req.query.range || 'week';
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

  const totalLeaveMin = allUsers.reduce((sum, u) => {
    return sum + (Q.getLeaveDaysForWeek(u.id, weekStart, weekEnd).leave_hours || 0) * 60;
  }, 0);
  const untrackedMin = Math.max(0, allUsers.length * targetMin - totalWeekMin - totalLeaveMin);

  res.json({
    range,
    kpis: {
      workforce_logged_today: Q.getOrgLoggedTodayCount(today),
      org_compliance_pct:     orgCompliance,
      org_utilization_pct:    allUsers.length
        ? Math.round((totalWeekMin / (allUsers.length * targetMin)) * 100) : 0,
      active_projects:        Q.getActiveProjects().length,
    },
    donut: {
      logged:    Math.round(totalWeekMin / 60),
      leave:     Math.round(totalLeaveMin / 60),
      untracked: Math.round(untrackedMin / 60),
      holiday:   0,
    },
    trend8w:     Q.getWeeklyTrend(8),
    teams:       Q.getTeamComparisonForWeek(weekStart, weekEnd),
    topProjects: Q.getByProjectForWeek(weekStart, weekEnd),
  });
});

module.exports = router;
