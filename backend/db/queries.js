// db/queries.js — single data-access module for the entire backend.
// Route files and services import this instead of writing raw SQL inline.
// Statements are prepared once at module load (require() is cached by Node).

const { db } = require('../db');

// ── users ──────────────────────────────────────────────────────────────────

const _userByEmail = db.prepare(
  'SELECT id, name, email, role, team_id, onboarding_status, sheet_id, sheet_range, eod_recipient_email FROM users WHERE email = ? AND is_active = 1'
);
function getUserByEmail(email) { return _userByEmail.get(email); }

const _userById = db.prepare(
  'SELECT id, name, email, role, team_id, onboarding_status, sheet_id, sheet_range, eod_recipient_email FROM users WHERE id = ?'
);
function getUserById(id) { return _userById.get(id); }

const _allActiveUsers = db.prepare(
  'SELECT id, name, email, role, team_id, onboarding_status, is_active FROM users WHERE is_active = 1 ORDER BY name'
);
function getAllActiveUsers() { return _allActiveUsers.all(); }

const _createUser = db.prepare(`
  INSERT INTO users (name, email, role, team_id, onboarding_status, is_active)
  VALUES (@name, @email, @role, @team_id, 'invited', 1)
`);
function createUser({ name, email, role, team_id = null }) {
  const info = _createUser.run({ name, email, role, team_id });
  return info.lastInsertRowid;
}

const _updateUser = db.prepare(`
  UPDATE users
  SET name      = COALESCE(@name,      name),
      role      = COALESCE(@role,      role),
      team_id   = COALESCE(@team_id,   team_id),
      is_active = COALESCE(@is_active, is_active)
  WHERE id = @id
`);
function updateUser(id, { name = null, role = null, team_id = null, is_active = null }) {
  _updateUser.run({ id, name, role, team_id, is_active });
}

// ── teams ──────────────────────────────────────────────────────────────────

const _allTeams = db.prepare('SELECT * FROM teams ORDER BY name');
function getAllTeams() { return _allTeams.all(); }

// ── projects ───────────────────────────────────────────────────────────────

const _activeProjects = db.prepare(
  'SELECT id, name, jira_project_key FROM projects WHERE is_active = 1 ORDER BY name'
);
function getActiveProjects() { return _activeProjects.all(); }

const _projectById = db.prepare(
  'SELECT id, name, jira_project_key FROM projects WHERE id = ? AND is_active = 1'
);
function getProjectById(id) { return _projectById.get(id); }

const _allProjectsAdmin = db.prepare('SELECT * FROM projects ORDER BY name');
function getAllProjectsAdmin() { return _allProjectsAdmin.all(); }

const _createProject = db.prepare(
  'INSERT INTO projects (name, jira_project_key, is_active) VALUES (@name, @jira_project_key, 1)'
);
function createProject({ name, jira_project_key }) {
  const info = _createProject.run({ name, jira_project_key });
  return info.lastInsertRowid;
}

// ── jira_tasks ─────────────────────────────────────────────────────────────

const _tasksByProject = db.prepare(
  'SELECT id, jira_key, summary FROM jira_tasks WHERE project_id = ? AND is_active = 1 ORDER BY jira_key'
);
function getTasksByProject(projectId) { return _tasksByProject.all(projectId); }

const _taskById = db.prepare('SELECT * FROM jira_tasks WHERE id = ?');
function getTaskById(id) { return _taskById.get(id); }

// ── worklog_entries ────────────────────────────────────────────────────────

// Enriched shape — includes jira_key and project_name for every downstream use.
const _entriesForDay = db.prepare(`
  SELECT e.*, t.jira_key, p.name AS project_name
  FROM worklog_entries e
  JOIN jira_tasks t ON t.id = e.jira_task_id
  JOIN projects  p ON p.id = e.project_id
  WHERE e.user_id = ? AND e.work_date = ?
  ORDER BY e.slot_start
`);
function getEntriesForDay(userId, workDate) { return _entriesForDay.all(userId, workDate); }

const _entryById = db.prepare(`
  SELECT e.*, t.jira_key, p.name AS project_name
  FROM worklog_entries e
  JOIN jira_tasks t ON t.id = e.jira_task_id
  JOIN projects  p ON p.id = e.project_id
  WHERE e.id = ?
`);
function getEntryById(id) { return _entryById.get(id); }

const _createEntry = db.prepare(`
  INSERT INTO worklog_entries
    (user_id, project_id, jira_task_id, description, duration_minutes,
     slot_start, slot_end, work_date, status)
  VALUES (@user_id, @project_id, @jira_task_id, @description, @duration_minutes,
          @slot_start, @slot_end, @work_date, 'draft')
`);
function createEntry({ user_id, project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date }) {
  const info = _createEntry.run({ user_id, project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date });
  return getEntryById(info.lastInsertRowid);
}

const _updateEntry = db.prepare(`
  UPDATE worklog_entries
  SET project_id = @project_id, jira_task_id = @jira_task_id, description = @description,
      duration_minutes = @duration_minutes, slot_start = @slot_start, slot_end = @slot_end,
      work_date = @work_date
  WHERE id = @id
`);
function updateEntry(id, { project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date }) {
  _updateEntry.run({ id, project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date });
  return getEntryById(id);
}

const _deleteEntry = db.prepare('DELETE FROM worklog_entries WHERE id = ?');
function deleteEntry(id) { _deleteEntry.run(id); }

// ── user_connections (encrypted tokens — TB-06, FR-19) ────────────────────
// encrypt/decrypt happens here; callers always receive plaintext values.
// The raw *_enc columns never leave this module.

const { encrypt, decrypt } = require('../services/crypto');

const _getConnection = db.prepare(
  'SELECT * FROM user_connections WHERE user_id = ? AND provider = ?'
);
function getConnection(userId, provider) {
  const row = _getConnection.get(userId, provider);
  if (!row) return null;
  return {
    ...row,
    access_token:  decrypt(row.access_token_enc),
    refresh_token: row.refresh_token_enc ? decrypt(row.refresh_token_enc) : null,
  };
}

const _upsertConnection = db.prepare(`
  INSERT INTO user_connections
    (user_id, provider, access_token_enc, refresh_token_enc, expires_at, scope)
  VALUES (@user_id, @provider, @access_token_enc, @refresh_token_enc, @expires_at, @scope)
  ON CONFLICT(user_id, provider) DO UPDATE SET
    access_token_enc  = excluded.access_token_enc,
    refresh_token_enc = excluded.refresh_token_enc,
    expires_at        = excluded.expires_at,
    scope             = excluded.scope,
    connected_at      = datetime('now')
`);
function upsertConnection(userId, provider, { access_token, refresh_token = null, expires_at = null, scope = null }) {
  _upsertConnection.run({
    user_id:           userId,
    provider,
    access_token_enc:  encrypt(access_token),
    refresh_token_enc: refresh_token ? encrypt(refresh_token) : null,
    expires_at,
    scope,
  });
  return getConnection(userId, provider);
}

// Atomic token rotation — only overwrites token fields, never scope (DevDoc §6.5).
// The old refresh token is invalidated by Atlassian/Google the instant we exchange it,
// so both writes MUST be inside one SQLite transaction or we risk a half-rotated state.
const _rotateToken = db.prepare(`
  UPDATE user_connections
  SET access_token_enc  = @access_token_enc,
      refresh_token_enc = @refresh_token_enc,
      expires_at        = @expires_at,
      connected_at      = datetime('now')
  WHERE user_id = @user_id AND provider = @provider
`);
function rotateToken(userId, provider, { access_token, refresh_token, expires_at = null }) {
  const tx = db.transaction(() => {
    _rotateToken.run({
      user_id:           userId,
      provider,
      access_token_enc:  encrypt(access_token),
      refresh_token_enc: encrypt(refresh_token),
      expires_at,
    });
  });
  tx();
  return getConnection(userId, provider);
}

const _deleteConnection = db.prepare(
  'DELETE FROM user_connections WHERE user_id = ? AND provider = ?'
);
function deleteConnection(userId, provider) { _deleteConnection.run(userId, provider); }

// ── external_writes (idempotent sync ledger — ADR-09) ─────────────────────

const _getExternalWrite = db.prepare(
  'SELECT * FROM external_writes WHERE worklog_entry_id = ? AND system = ?'
);
function getExternalWrite(worklogEntryId, system) {
  return _getExternalWrite.get(worklogEntryId, system);
}

const _insertExternalWrite = db.prepare(`
  INSERT INTO external_writes
    (worklog_entry_id, user_id, work_date, system, status, attempt_count, created_at, updated_at)
  VALUES (@worklog_entry_id, @user_id, @work_date, @system, 'pending', 0, datetime('now'), datetime('now'))
`);
function insertExternalWrite({ worklog_entry_id, user_id, work_date, system }) {
  _insertExternalWrite.run({ worklog_entry_id, user_id, work_date, system });
  return getExternalWrite(worklog_entry_id, system);
}

const _markSynced = db.prepare(`
  UPDATE external_writes
  SET status = 'synced', external_id = ?, attempt_count = attempt_count + 1,
      last_error = NULL, updated_at = datetime('now')
  WHERE id = ?
`);
function markExternalWriteSynced(id, externalId) { _markSynced.run(externalId, id); }

const _markFailed = db.prepare(`
  UPDATE external_writes
  SET status = 'failed', last_error = ?, attempt_count = attempt_count + 1,
      updated_at = datetime('now')
  WHERE id = ?
`);
function markExternalWriteFailed(id, errorMessage) { _markFailed.run(errorMessage, id); }

const _extWritesForDay = db.prepare(
  'SELECT * FROM external_writes WHERE user_id = ? AND work_date = ?'
);
function getExternalWritesForDay(userId, workDate) {
  return _extWritesForDay.all(userId, workDate);
}

// ── eod_reports ────────────────────────────────────────────────────────────

const _upsertEodReport = db.prepare(`
  INSERT INTO eod_reports (user_id, work_date, gmail_draft_id, sheet_appended, status)
  VALUES (@user_id, @work_date, @gmail_draft_id, @sheet_appended, @status)
  ON CONFLICT(user_id, work_date) DO UPDATE SET
    gmail_draft_id = excluded.gmail_draft_id,
    sheet_appended = excluded.sheet_appended,
    status         = excluded.status
`);
function upsertEodReport({ user_id, work_date, gmail_draft_id = null, sheet_appended = 0, status = 'ok' }) {
  _upsertEodReport.run({ user_id, work_date, gmail_draft_id, sheet_appended, status });
}

// ── settings ───────────────────────────────────────────────────────────────

const _allSettings = db.prepare('SELECT key, value FROM settings');
function getAllSettings() {
  const rows = _allSettings.all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

const _upsertSetting = db.prepare(`
  INSERT INTO settings (key, value, updated_by_user_id)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value              = excluded.value,
    updated_at         = datetime('now'),
    updated_by_user_id = excluded.updated_by_user_id
`);
function upsertSettings(patch, updatedByUserId) {
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) _upsertSetting.run(k, String(v), updatedByUserId);
  });
  tx();
}

// ── leave_days ─────────────────────────────────────────────────────────────

const _leaveForUser = db.prepare('SELECT * FROM leave_days WHERE user_id = ? ORDER BY leave_date DESC');
function getLeaveDays(userId) { return _leaveForUser.all(userId); }

const _allLeave = db.prepare('SELECT * FROM leave_days ORDER BY leave_date DESC LIMIT 200');
function getAllLeaveDays() { return _allLeave.all(); }

const _upsertLeave = db.prepare(`
  INSERT INTO leave_days (user_id, leave_date, leave_type, hours, created_by_user_id)
  VALUES (@user_id, @leave_date, @leave_type, @hours, @created_by_user_id)
  ON CONFLICT(user_id, leave_date) DO UPDATE SET
    leave_type = excluded.leave_type,
    hours      = excluded.hours
`);
function upsertLeaveDay({ user_id, leave_date, leave_type, hours = 8, created_by_user_id }) {
  const info = _upsertLeave.run({ user_id, leave_date, leave_type, hours, created_by_user_id });
  return info.lastInsertRowid;
}

// ── reminder_runs ──────────────────────────────────────────────────────────

const _createReminderRun = db.prepare(`
  INSERT INTO reminder_runs (run_type, triggered_by, created_by_user_id)
  VALUES (@run_type, @triggered_by, @created_by_user_id)
`);
function createReminderRun({ run_type, triggered_by, created_by_user_id }) {
  const info = _createReminderRun.run({ run_type, triggered_by, created_by_user_id });
  return info.lastInsertRowid;
}

const _recentRuns = db.prepare('SELECT * FROM reminder_runs ORDER BY run_at DESC LIMIT ?');
function getRecentReminderRuns(limit = 50) { return _recentRuns.all(limit); }

// ── audit_log ──────────────────────────────────────────────────────────────

const _appendAudit = db.prepare(`
  INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
  VALUES (@actor_user_id, @action, @target_type, @target_id, @detail)
`);
function appendAuditLog({ actor_user_id, action, target_type = null, target_id = null, detail = null }) {
  _appendAudit.run({ actor_user_id, action, target_type, target_id, detail });
}

// ── dashboard (composite queries) ─────────────────────────────────────────

const _teamLoggedCount = db.prepare(`
  SELECT COUNT(DISTINCT user_id) AS n FROM worklog_entries
  WHERE work_date = ? AND user_id IN (SELECT id FROM users WHERE team_id = ?)
`);
function getTeamLoggedTodayCount(teamId, workDate) {
  return _teamLoggedCount.get(workDate, teamId).n;
}

const _byTicketForTeam = db.prepare(`
  SELECT t.jira_key, SUM(e.duration_minutes) AS minutes
  FROM worklog_entries e
  JOIN jira_tasks t ON t.id = e.jira_task_id
  WHERE e.work_date = ? AND e.user_id IN (SELECT id FROM users WHERE team_id = ?)
  GROUP BY t.jira_key
  ORDER BY minutes DESC
`);
function getByTicketForTeamToday(teamId, workDate) {
  return _byTicketForTeam.all(workDate, teamId);
}

const _notLoggedToday = db.prepare(`
  SELECT u.id, u.name FROM users u
  WHERE u.team_id = ? AND u.is_active = 1
    AND u.id NOT IN (SELECT DISTINCT user_id FROM worklog_entries WHERE work_date = ?)
`);
function getUsersNotLoggedToday(teamId, workDate) {
  return _notLoggedToday.all(teamId, workDate);
}

const _teamMembersMinutes = db.prepare(`
  SELECT u.id, u.name, COALESCE(SUM(e.duration_minutes), 0) AS minutes_today
  FROM users u
  LEFT JOIN worklog_entries e ON e.user_id = u.id AND e.work_date = ?
  WHERE u.team_id = ? AND u.is_active = 1
  GROUP BY u.id
`);
function getTeamMembersWithMinutesToday(teamId, workDate) {
  return _teamMembersMinutes.all(workDate, teamId);
}

// ── exports ────────────────────────────────────────────────────────────────

module.exports = {
  // users
  getUserByEmail, getUserById, getAllActiveUsers, createUser, updateUser,
  // teams
  getAllTeams,
  // projects
  getActiveProjects, getProjectById, getAllProjectsAdmin, createProject,
  // jira_tasks
  getTasksByProject, getTaskById,
  // worklog_entries
  getEntriesForDay, getEntryById, createEntry, updateEntry, deleteEntry,
  // user_connections (encrypted)
  getConnection, upsertConnection, rotateToken, deleteConnection,
  // external_writes
  getExternalWrite, insertExternalWrite, markExternalWriteSynced, markExternalWriteFailed, getExternalWritesForDay,
  // eod_reports
  upsertEodReport,
  // settings
  getAllSettings, upsertSettings,
  // leave_days
  getLeaveDays, getAllLeaveDays, upsertLeaveDay,
  // reminder_runs
  createReminderRun, getRecentReminderRuns,
  // audit_log
  appendAuditLog,
  // dashboard
  getTeamLoggedTodayCount, getByTicketForTeamToday, getUsersNotLoggedToday, getTeamMembersWithMinutesToday,
};
