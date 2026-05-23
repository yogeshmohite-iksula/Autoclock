// LeaveLegend — small color-coded legend explaining the calendar markers.
// Page-local; not reused. Scoped under .page-leave (styles live in leave-calendar.css).

import './LeaveLegend.css';

const ITEMS = [
  { key: 'leave',   className: 'leave-legend__sw--leave',   label: 'On leave' },
  { key: 'holiday', className: 'leave-legend__sw--holiday', label: 'Holiday' },
  { key: 'today',   className: 'leave-legend__sw--today',   label: 'Today' },
  { key: 'weekend', className: 'leave-legend__sw--weekend', label: 'Weekend' },
];

export default function LeaveLegend({ summary }) {
  return (
    <aside className="leave-legend" aria-label="Calendar legend">
      <div className="leave-legend__title">Legend</div>
      <ul className="leave-legend__list">
        {ITEMS.map((it) => (
          <li key={it.key} className="leave-legend__row">
            <span className={`leave-legend__sw ${it.className}`} aria-hidden="true" />
            <span className="leave-legend__lbl">{it.label}</span>
          </li>
        ))}
      </ul>
      {summary && (
        <div className="leave-legend__summary">
          <div className="leave-legend__summary-num">{summary.peopleOnLeaveThisMonth}</div>
          <div className="leave-legend__summary-lbl">
            {summary.peopleOnLeaveThisMonth === 1 ? 'person' : 'people'} on leave this month
          </div>
          <div className="leave-legend__summary-sub">
            {summary.daysTotal} day{summary.daysTotal === 1 ? '' : 's'} total
          </div>
        </div>
      )}
    </aside>
  );
}
