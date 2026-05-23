// HistoryRailCalendar — month-grid view of the history rail.
// Lays out the days array on a 7-wide grid (Mon–Sun). Cells outside the
// supplied range render as a blank "off-month" placeholder so the grid never
// re-flows when the user scrubs. Each cell shows the day-of-month, a tiny
// hours bar, and a small sync dot — clicking selects that day.
//
// We render using `role="grid"` + `role="row"`/`role="gridcell"` (chose this
// over <table> because every cell is a focusable button — `role="grid"`
// integrates more cleanly with the button semantics).
//
// Body-class scoped: classes (`.cal-grid`, `.cal-cell`, `.cal-head`) live under
// `.page-history` in `my-history.css`.

import { fmtDur } from '../../lib/format';

const DAILY_TARGET_MIN = 480;
const WD_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Sync tone → CSS class on the cell's dot. Mirrors StatusPill colours.
const SYNC_DOT = {
  synced:  'is-synced',
  partial: 'is-partial',
  skipped: 'is-skipped',
  failed:  'is-failed',
};
const SYNC_LABEL = {
  synced:  'Synced',
  partial: 'Partial',
  skipped: 'Skipped',
  failed:  'Failed',
};

/** Build the visible month grid for the supplied days[].
 *  Anchors on the *latest* day in `days` — that's the month we show. */
function buildGrid(days) {
  if (!days.length) return { monthLabel: '', cells: [] };
  const last = new Date(`${days[days.length - 1].key}T00:00:00`);
  const y = last.getFullYear();
  const m = last.getMonth();
  const monthLabel = last.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // First-of-month + length
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  // Monday=0 … Sunday=6 (JS Sunday=0, so shift)
  const firstDow = (first.getDay() + 6) % 7;

  const byKey = new Map(days.map((d) => [d.key, d]));
  const cells = [];

  // Leading blanks
  for (let i = 0; i < firstDow; i++) cells.push({ kind: 'blank', key: `b-${i}` });

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = byKey.get(iso);
    cells.push({ kind: 'day', key: iso, day: d, data });
  }

  // Trailing blanks to a multiple of 7
  while (cells.length % 7 !== 0) cells.push({ kind: 'blank', key: `t-${cells.length}` });

  return { monthLabel, cells };
}

export default function HistoryRailCalendar({ days = [], selectedKey, onSelect }) {
  const { monthLabel, cells } = buildGrid(days);

  // Group cells into rows of 7 for the row/gridcell ARIA tree.
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="cal" role="grid" aria-label={`History — ${monthLabel}`}>
      <div className="cal-month">{monthLabel}</div>
      <div className="cal-head" role="row">
        {WD_HEAD.map((w) => (
          <span key={w} className="cal-head__cell" role="columnheader">{w}</span>
        ))}
      </div>
      <div className="cal-grid">
        {rows.map((row, ri) => (
          <div key={ri} className="cal-row" role="row">
            {row.map((c) => {
              if (c.kind === 'blank') {
                return <div key={c.key} className="cal-cell is-blank" role="gridcell" aria-hidden="true" />;
              }
              const data = c.data;
              const hrs = data ? data.hrs : 0;
              const pct = Math.min(100, Math.round((hrs / DAILY_TARGET_MIN) * 100));
              const sync = data?.sync;
              const isSel = c.key === selectedKey;
              const dotCls = SYNC_DOT[sync] || '';
              const syncLabel = SYNC_LABEL[sync] || 'No data';
              const ariaLabel = data
                ? `${c.day} — ${fmtDur(hrs)}, ${syncLabel}`
                : `${c.day} — no data`;
              return (
                <div key={c.key} className="cal-cell" role="gridcell" aria-selected={isSel || undefined}>
                  <button
                    type="button"
                    className={'cal-cell__btn' + (isSel ? ' is-selected' : '') + (data ? '' : ' is-empty')}
                    aria-current={isSel ? 'date' : undefined}
                    aria-label={ariaLabel}
                    onClick={() => data && onSelect && onSelect(c.key)}
                    disabled={!data}
                  >
                    <span className="cal-cell__day">{c.day}</span>
                    <span className="cal-cell__bar" aria-hidden="true">
                      <span className="cal-cell__bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                    {sync && <span className={`cal-cell__dot ${dotCls}`} aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
