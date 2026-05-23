// LeaveListRow — one row in the list view (table semantics): avatar + name +
// team + date range + reason + status pill. Page-local to .page-leave.

import StatusPill from '../pills/StatusPill';
import './LeaveListRow.css';

const STATUS_TONE = {
  approved: 'ok',
  pending:  'pending',
  denied:   'failed',
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function rangeLabel(start, end) {
  if (!start) return '';
  if (!end || start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function durationDays(start, end) {
  if (!start) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end || start}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export default function LeaveListRow({ leave }) {
  if (!leave) return null;
  const tone = STATUS_TONE[leave.status] || 'info';
  const days = durationDays(leave.start, leave.end);
  return (
    <article className="leave-list-row" data-status={leave.status || 'approved'}>
      <span
        className="leave-list-row__avatar"
        style={{ background: leave.hue || 'var(--ac-text-muted)' }}
        aria-hidden="true"
      >
        {leave.initial || (leave.person || '?').charAt(0)}
      </span>
      <div className="leave-list-row__person">
        <div className="leave-list-row__name">{leave.person}</div>
        <div className="leave-list-row__team">{leave.team}</div>
      </div>
      <div className="leave-list-row__range">
        <div className="leave-list-row__range-txt">{rangeLabel(leave.start, leave.end)}</div>
        <div className="leave-list-row__range-sub">{days} day{days === 1 ? '' : 's'}</div>
      </div>
      <div className="leave-list-row__reason" title={leave.reason}>{leave.reason}</div>
      <div className="leave-list-row__status">
        <StatusPill tone={tone}>{leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : 'Approved'}</StatusPill>
      </div>
    </article>
  );
}
