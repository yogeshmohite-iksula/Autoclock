// parser.js — AutoClock free deterministic parser (v0.2).
// Zero AI, zero cost (ADR-02). Frozen public interface: see docs/parser-spec.md.
// Consumed by Keval's entries API (EP-08..EP-11) and the EP-12/13 preview/close flow.
//
// Exports:
//   parseDuration(raw)                  → integer minutes (0 on invalid)
//   durationFromSlot(slotStart, slotEnd)→ integer minutes (0 on invalid)
//   tidy(desc)                          → cleaned string
//   groupByTicket(entries)              → [{ jira_key, minutes, lines }]
//   validateEntry(entry)                → string[] (empty = valid)
//   validateDay(entries)                → { errors, warnings, total_minutes }
//   toJiraStarted(workDate, slotStart)  → "YYYY-MM-DDThh:mm:00.000+0530"

'use strict';

// ---------------------------------------------------------------------------
// 4.1 parseDuration — every supported format → integer minutes
// ---------------------------------------------------------------------------
function parseDuration(raw) {
  if (raw === null || raw === undefined) return 0;
  // Normalise: cast, lowercase, trim, collapse whitespace.
  let s = String(raw).toLowerCase().trim().replace(/\s+/g, ' ');
  if (!s) return 0;
  // Normalise units: hour/hours/hr/hrs → h ; minute/minutes/min/mins → m
  // Leading `\b` would fail to match digit-attached forms ("2.25hr") because
  // both sides are \w. Trailing `\b` (or end-of-string) is enough; the
  // allow-list test below rejects any over-eager partial replacement.
  s = s
    .replace(/(hours?|hrs?)\b/g, 'h')
    .replace(/(minutes?|mins?)\b/g, 'm');

  // Reject anything containing a non-allowed char early (no minus, no extra letters).
  // Allowed chars after normalisation: digits, '.', ':', 'h', 'm', spaces.
  if (/[^0-9.:hm\s]/.test(s)) return 0;

  // Pattern 1: "<H>h" / "<H.HH>h" / "<H>h <M>m" / "<H>h<M>m" / "<H>h<M>" / "<H>h <M>"
  //            e.g. "1h", "1.5h", "1h 30m", "1h30m", "1h30", "2.25h"
  let m = s.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (m) {
    const hours = parseFloat(m[1]);
    const extraMins = m[2] ? parseInt(m[2], 10) : 0;
    return Math.round(hours * 60) + extraMins;
  }

  // Pattern 2: "<M>m" — minutes only, no hours.
  m = s.match(/^(\d+)\s*m$/);
  if (m) return parseInt(m[1], 10);

  // Pattern 3: "HH:MM" — duration form (NOT clock time).
  m = s.match(/^(\d+):(\d+)$/);
  if (m) {
    const mm = parseInt(m[2], 10);
    if (mm >= 60) return 0; // sanity: minutes part must be < 60
    return parseInt(m[1], 10) * 60 + mm;
  }

  // Pattern 4: bare integer → minutes (matches DevDoc §4.1 spec).
  m = s.match(/^(\d+)$/);
  if (m) return parseInt(m[1], 10);

  // Bare decimal ("1.5", "45.5") is ambiguous → 0 (validator rejects 0 loudly).
  return 0;
}

// ---------------------------------------------------------------------------
// 4.1b durationFromSlot — derive minutes from a HH:MM..HH:MM range
// ---------------------------------------------------------------------------
function durationFromSlot(slotStart, slotEnd) {
  const start = parseClock(slotStart);
  const end = parseClock(slotEnd);
  if (start === null || end === null) return 0;
  if (end <= start) return 0;
  return end - start;
}

// ---------------------------------------------------------------------------
// 4.2 tidy — deterministic free-text cleanup
// ---------------------------------------------------------------------------
const SHORTHAND = {
  scrum: 'Daily Scrum',
  standup: 'Stand-up',
  tc: 'test cases',
  grooming: 'Backlog Grooming',
  uat: 'UAT',
  qa: 'QA',
  pr: 'PR',
};

function tidy(desc) {
  let d = String(desc ?? '').trim().replace(/\s+/g, ' ');
  if (!d) return '';
  for (const [k, v] of Object.entries(SHORTHAND)) {
    d = d.replace(new RegExp(`\\b${escapeRegex(k)}\\b`, 'gi'), v);
  }
  // Strip trailing comma/semicolon/colon — keep . ! ? as meaningful punctuation.
  d = d.replace(/[,;:]+$/, '').trim();
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ---------------------------------------------------------------------------
// 4.3 groupByTicket — stable, first-seen order
// ---------------------------------------------------------------------------
function groupByTicket(entries) {
  const map = new Map();
  for (const e of entries || []) {
    // Defensive: skip null/undefined or entries missing a jira_key.
    // EP-12 preview must never crash on a half-saved draft or sparse array.
    if (!e || !e.jira_key) continue;
    const key = e.jira_key;
    if (!map.has(key)) map.set(key, { jira_key: key, minutes: 0, lines: [] });
    const g = map.get(key);
    // Use Number.isInteger to match validateEntry (PR #1 review medium 1) —
    // a non-integer duration_minutes never reaches a synced worklog anyway.
    g.minutes += Number.isInteger(e.duration_minutes) ? e.duration_minutes : 0;
    g.lines.push(tidy(e.description));
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// 4.4 validateEntry — gatekeeps Confirm; returns string[]
// ---------------------------------------------------------------------------
function validateEntry(e) {
  const errs = [];
  if (e === null || e === undefined) return ['entry is null/undefined'];

  if (!e.jira_task_id) errs.push('jira_task_id required');

  const desc = String(e.description ?? '').trim();
  if (!desc) errs.push('description required');
  else if (desc.length > 1000) errs.push('description too long (max 1000 chars)');

  if (!Number.isInteger(e.duration_minutes) || e.duration_minutes <= 0) {
    errs.push('duration_minutes must be a positive integer');
  }

  const validStart = isValidHHMM(e.slot_start);
  const validEnd = isValidHHMM(e.slot_end);
  if (!validStart) errs.push('slot_start must be HH:MM (00–23:00–59)');
  if (!validEnd) errs.push('slot_end must be HH:MM (00–23:00–59)');
  if (validStart && validEnd && parseClock(e.slot_end) <= parseClock(e.slot_start)) {
    errs.push('slot_end must be after slot_start');
  }

  return errs;
}

// ---------------------------------------------------------------------------
// 4.4b validateDay — errors block Confirm; warnings surface in preview
// ---------------------------------------------------------------------------
const LARGE_GAP_MINUTES = 240; // 4 hours

function validateDay(entries) {
  const list = entries || [];
  const errors = [];
  const warnings = [];
  let total = 0;

  for (const e of list) {
    const errs = validateEntry(e);
    if (errs.length) errors.push({ entry_id: e?.id ?? null, errs });
    if (Number.isInteger(e?.duration_minutes) && e.duration_minutes > 0) {
      total += e.duration_minutes;
    }
  }
  if (total > 1440) errors.push({ entry_id: null, errs: ['total minutes > 24h'] });

  // Per-entry duration-vs-slot mismatch warnings (only for entries that have valid slot times)
  for (const e of list) {
    if (!isValidHHMM(e?.slot_start) || !isValidHHMM(e?.slot_end)) continue;
    const slotMins = parseClock(e.slot_end) - parseClock(e.slot_start);
    if (slotMins <= 0) continue;
    if (Number.isInteger(e.duration_minutes) && e.duration_minutes > 0 && slotMins !== e.duration_minutes) {
      warnings.push({
        kind: 'duration_mismatch',
        entry_id: e.id ?? null,
        slot_minutes: slotMins,
        duration_minutes: e.duration_minutes,
      });
    }
  }

  // Overlap + large-gap warnings — sort by start time
  const usable = list.filter(e => isValidHHMM(e?.slot_start) && isValidHHMM(e?.slot_end));
  const sorted = [...usable].sort((a, b) => parseClock(a.slot_start) - parseClock(b.slot_start));
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = parseClock(sorted[i - 1].slot_end);
    const curStart = parseClock(sorted[i].slot_start);
    if (curStart < prevEnd) {
      warnings.push({
        kind: 'overlap',
        between: [sorted[i - 1].id ?? null, sorted[i].id ?? null],
      });
    } else if (curStart - prevEnd > LARGE_GAP_MINUTES) {
      warnings.push({
        kind: 'large_gap',
        between: [sorted[i - 1].id ?? null, sorted[i].id ?? null],
        gap_minutes: curStart - prevEnd,
      });
    }
  }

  return { errors, warnings, total_minutes: total };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HHMM_RE = /^(\d{2}):(\d{2})$/;

function isValidHHMM(s) {
  const m = String(s ?? '').match(HHMM_RE);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  return h >= 0 && h <= 23 && mm >= 0 && mm <= 59;
}

function parseClock(s) {
  if (!isValidHHMM(s)) return null;
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + m;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build the Jira "started" string with IST offset (DevDoc §6.2).
function toJiraStarted(workDate, slotStart) {
  return `${workDate}T${slotStart}:00.000+0530`;
}

module.exports = {
  parseDuration,
  durationFromSlot,
  tidy,
  groupByTicket,
  validateEntry,
  validateDay,
  toJiraStarted,
};
