// DayRowExpandable — collapsible per-day summary row that reveals a list of
// <TicketRow>s when activated. Used by P09 Team Member Detail.
//
// Accessibility (PRD §11):
//   - <button aria-expanded aria-controls> is the primary trigger.
//   - The expanded panel has id={`${rowId}-panel`} matching aria-controls.
//   - The panel is `hidden` when collapsed — Playwright's `toBeVisible()` works.

import { useId, useState } from 'react';
import TicketRow from './TicketRow';
import { fmtDur } from '../../lib/format';

const SYNC_LABEL = {
  synced:  'all synced',
  partial: 'partial sync',
  missing: 'not synced',
  skipped: 'skipped',
  zero:    'no log',
};

export default function DayRowExpandable({ day, defaultExpanded = false, projColorByKey }) {
  const [open, setOpen] = useState(defaultExpanded);
  const baseId = useId();
  const buttonId = `${baseId}-btn`;
  const panelId = `${baseId}-panel`;
  const tickets = day.tickets || [];
  // Pick the "dominant" sync status for the day summary — partial overrides synced.
  const summarySync = tickets.some(t => t.sync === 'partial') ? 'partial'
    : tickets.some(t => t.sync === 'missing') ? 'missing'
    : tickets.every(t => t.sync === 'synced') && tickets.length ? 'synced'
    : 'skipped';

  return (
    <div className={`day-row ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        id={buttonId}
        className="day-row__head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
      >
        <span className="day-row__date">
          <span className="wd">{day.wd}</span>
          <span className="day">{(day.date || '').slice(-2)}</span>
        </span>
        <span className="day-body">
          <span className="top">
            <span>{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
            <span className="ticket-hint">{day.date}</span>
          </span>
          <span className="sub">
            <span className={`dot ${summarySync}`} aria-hidden="true" />
            {SYNC_LABEL[summarySync] || summarySync}
          </span>
        </span>
        <span className="day-row__right">
          <span className="hrs">{fmtDur(day.total)}</span>
          <span className="chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="day-row__panel"
        hidden={!open}
      >
        {tickets.length === 0 ? (
          <div className="day-row__empty">No tickets logged.</div>
        ) : (
          <ul className="ticket-list">
            {tickets.map((t, i) => (
              <TicketRow
                key={`${t.key}-${i}`}
                ticket={t}
                projColor={projColorByKey?.[t.proj] || projColorByKey?.[t.key]}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
