// parser.js — the free deterministic parser. Zero AI, zero cost (ADR-02).
// Three jobs (DevDoc §4): parseDuration, tidy, groupByTicket.
// Plus validate() — gatekeeps "Close My Day" so junk never reaches Jira.

// ---- 4.1 Duration → minutes ---------------------------------------------------
// Handles "30m", "1h", "1.5h", "1h 30m", "90", "90 min", "2 hrs"
function parseDuration(raw) {
  const s = String(raw ?? '').toLowerCase().trim();
  let mins = 0;
  const h = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  const m = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);
  if (h) mins += Math.round(parseFloat(h[1]) * 60);
  if (m) mins += parseInt(m[1], 10);
  if (!h && !m) {
    const n = s.match(/^(\d+)$/);
    if (n) mins = parseInt(n[1], 10);
  }
  return mins;
}

// ---- 4.2 Description tidy -----------------------------------------------------
const SHORTHAND = {
  scrum: 'Daily Scrum',
  standup: 'Stand-up',
  tc: 'test cases',
  grooming: 'Backlog Grooming',
  uat: 'UAT',
};

function tidy(desc) {
  let d = String(desc ?? '').trim().replace(/\s+/g, ' ');
  for (const [k, v] of Object.entries(SHORTHAND)) {
    d = d.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
  }
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ---- 4.3 Group entries by ticket ----------------------------------------------
// Input rows must carry { jira_key, duration_minutes, description }.
function groupByTicket(entries) {
  const map = {};
  for (const e of entries) {
    const key = e.jira_key;
    if (!map[key]) map[key] = { jira_key: key, minutes: 0, lines: [] };
    map[key].minutes += e.duration_minutes;
    map[key].lines.push(tidy(e.description));
  }
  return Object.values(map);
}

// ---- 4.4 Validate one entry (gatekeeps Confirm — DevDoc §4.4) -----------------
function validateEntry(e) {
  const errs = [];
  if (!Number.isInteger(e.duration_minutes) || e.duration_minutes <= 0) errs.push('duration_minutes must be > 0');
  if (!e.slot_start || !e.slot_end) errs.push('slot_start and slot_end are required');
  else if (toMin(e.slot_end) <= toMin(e.slot_start)) errs.push('slot_end must be after slot_start');
  if (!e.jira_task_id) errs.push('jira_task_id required');
  if (!e.description || !String(e.description).trim()) errs.push('description required');
  return errs;
}

// Validate the whole day before Close My Day.
function validateDay(entries) {
  const errors = [];
  const warnings = [];
  let total = 0;
  for (const e of entries) {
    const errs = validateEntry(e);
    if (errs.length) errors.push({ entry_id: e.id, errs });
    total += e.duration_minutes || 0;
  }
  if (total > 1440) errors.push({ entry_id: null, errs: ['total minutes > 24h'] });

  // Overlap warnings (not blocking)
  const sorted = [...entries].sort((a, b) => toMin(a.slot_start) - toMin(b.slot_start));
  for (let i = 1; i < sorted.length; i++) {
    if (toMin(sorted[i].slot_start) < toMin(sorted[i - 1].slot_end)) {
      warnings.push({ kind: 'overlap', between: [sorted[i - 1].id, sorted[i].id] });
    }
  }
  return { errors, warnings, total_minutes: total };
}

function toMin(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Build the Jira "started" string with IST offset (DevDoc §6.2).
function toJiraStarted(workDate, slotStart) {
  return `${workDate}T${slotStart}:00.000+0530`;
}

module.exports = { parseDuration, tidy, groupByTicket, validateEntry, validateDay, toJiraStarted };
