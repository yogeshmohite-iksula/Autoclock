// TicketRow — compact per-ticket row. Used by:
//   • P09 Team Member Detail (inside DayRowExpandable's expanded panel)
//   • P12 Reminder Recipients (planned)
//
// Renders: project bubble · jira-key chip · title · minutes · sync dot.
// All styling lives in the parent page's CSS (`.page-team-member .ticket-row`).

import { fmtDur } from '../../lib/format';

const SYNC_LABEL = {
  synced:  'Synced',
  partial: 'Partial sync',
  missing: 'Not synced',
  skipped: 'Skipped',
  zero:    'No log',
  live:    'In progress',
};

export default function TicketRow({ ticket, projColor = '#2563EB' }) {
  const { proj, key, title, mins, sync } = ticket;
  // CSS custom property — let the page CSS pick it up via `var(--proj-color)`.
  const style = { '--proj-color': projColor };
  return (
    <li className="ticket-row" style={style}>
      <span className="proj-bubble" aria-hidden="true">{(proj || '?').slice(0, 1)}</span>
      <div className="info">
        <div className="top-line">
          <span className="key">{key}</span>
          <span className="title-text" title={title}>{title}</span>
        </div>
      </div>
      <div className="hrs">
        {fmtDur(mins)}
        {sync && (
          <span
            className={`sync-dot sync-dot--${sync}`}
            aria-label={SYNC_LABEL[sync] || sync}
            title={SYNC_LABEL[sync] || sync}
          />
        )}
      </div>
    </li>
  );
}
