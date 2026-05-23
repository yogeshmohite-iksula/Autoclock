// MonthCalendar — 7-col month grid with semantic <table role="grid"> markup.
// Each cell shows: day-of-month, holiday badge (if any), up to 3 leave avatars
// (with "+N" overflow), and is visually marked when it is "today".
// Click a cell → onSelectDay(YYYY-MM-DD).
// WCAG 2.1 AA: weekday <th scope="col">, td role="gridcell", today gets
// aria-current="date", cells with leave/holiday include an accessible label.

import { useMemo } from 'react';
import HolidayChip from './HolidayChip';
import './MonthCalendar.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Build the month grid: array of weeks, each week is 7 cells.
// Monday-start week. ISO date strings only.
function buildGrid(monthIso) {
  const [yearStr, monthStr] = monthIso.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0); // last day of month
  const daysInMonth = last.getDate();

  // Monday-first: JS getDay() Sun=0..Sat=6, want Mon=0..Sun=6
  const firstWeekdayMonFirst = (first.getDay() + 6) % 7;

  const cells = [];
  // Leading blanks (from previous month) — show grey-out
  for (let i = 0; i < firstWeekdayMonFirst; i += 1) {
    const prevDate = new Date(year, month, -((firstWeekdayMonFirst - 1) - i));
    cells.push({ iso: toIso(prevDate), day: prevDate.getDate(), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dt = new Date(year, month, d);
    cells.push({ iso: toIso(dt), day: d, inMonth: true });
  }
  // Trailing blanks to fill the final week
  while (cells.length % 7 !== 0) {
    const idx = cells.length - (firstWeekdayMonFirst + daysInMonth);
    const dt = new Date(year, month + 1, idx + 1);
    cells.push({ iso: toIso(dt), day: dt.getDate(), inMonth: false });
  }
  // Group into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Determine whether `iso` is between `start` and `end` inclusive (string compare works on ISO dates).
function dayWithinRange(iso, start, end) {
  if (!start) return false;
  const finish = end || start;
  return iso >= start && iso <= finish;
}

export default function MonthCalendar({
  month,         // 'YYYY-MM'
  todayIso,      // 'YYYY-MM-DD'
  holidays = [],
  leave = [],
  onSelectDay,
  compact = false, // mobile-mode flag
}) {
  const weeks = useMemo(() => buildGrid(month), [month]);
  const holidayByDate = useMemo(() => {
    const map = new Map();
    for (const h of holidays) map.set(h.date, h);
    return map;
  }, [holidays]);
  // Pre-compute per-date leave list
  const leaveByDate = useMemo(() => {
    const map = new Map();
    for (const l of leave) {
      // Iterate from start..end (inclusive)
      const start = new Date(`${l.start}T00:00:00`);
      const end   = new Date(`${(l.end || l.start)}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = toIso(d);
        if (!map.has(iso)) map.set(iso, []);
        map.get(iso).push(l);
      }
    }
    return map;
  }, [leave]);

  return (
    <div className={`leave-month${compact ? ' leave-month--compact' : ''}`}>
      <table className="leave-month__grid" role="grid" aria-label={`Calendar for ${month}`}>
        <thead>
          <tr>
            {WEEKDAYS.map((wd, i) => (
              <th key={wd} scope="col" className={`leave-month__wd${i >= 5 ? ' leave-month__wd--we' : ''}`}>
                {wd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi} className="leave-month__week">
              {week.map((cell, ci) => {
                const isWeekend = ci >= 5;
                const isToday = cell.iso === todayIso;
                const holiday = holidayByDate.get(cell.iso);
                const onLeave = leaveByDate.get(cell.iso) || [];
                const out = !cell.inMonth;
                const labelParts = [cell.iso];
                if (isToday) labelParts.push('today');
                if (holiday) labelParts.push(`holiday: ${holiday.name}`);
                if (onLeave.length) labelParts.push(`${onLeave.length} on leave`);
                const visible = onLeave.slice(0, compact ? 0 : 3);
                const overflow = onLeave.length - visible.length;
                return (
                  <td
                    key={cell.iso}
                    role="gridcell"
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={labelParts.join(', ')}
                    className={[
                      'leave-month__cell',
                      out ? 'is-out' : '',
                      isWeekend ? 'is-weekend' : '',
                      isToday ? 'is-today' : '',
                      holiday ? 'is-holiday' : '',
                      onLeave.length ? 'is-has-leave' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <button
                      type="button"
                      className="leave-month__btn"
                      onClick={() => onSelectDay && onSelectDay(cell.iso)}
                      tabIndex={out ? -1 : 0}
                    >
                      <span className="leave-month__day">{cell.day}</span>
                      {holiday && !compact && <HolidayChip name={holiday.name} compact />}
                      {visible.length > 0 && (
                        <div className="leave-month__avatars" aria-hidden="true">
                          {visible.map((l) => (
                            <span
                              key={l.id}
                              className="leave-month__av"
                              style={{ background: l.hue || 'var(--ac-text-muted)' }}
                              title={`${l.person} — ${l.reason || 'leave'}`}
                            >
                              {l.initial || (l.person || '?').charAt(0)}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span className="leave-month__av leave-month__av--more">+{overflow}</span>
                          )}
                        </div>
                      )}
                      {compact && onLeave.length > 0 && (
                        <span className="leave-month__compact-badge" aria-hidden="true">+{onLeave.length}</span>
                      )}
                      {compact && holiday && (
                        <span className="leave-month__compact-holiday" aria-hidden="true">★</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Exported for the page's "upcoming/holidays" filters that need same helpers.
export { dayWithinRange, toIso };
