// DaySummaryPanel — the right pane for P07. Renders the selected day's meta
// (date + sync state + total hours) and the grouped tickets using the same
// <TicketGroupCard> the Close My Day preview uses.
//
// Body-class scoping: classes (`.panel-hero`, `.panel-meta`, `.groups`) live
// under `.page-history` in `my-history.css`. <TicketGroupCard> uses its own
// generic `.group` class — the host page provides scoped styles for it.

import StatusPill from '../pills/StatusPill';
import TicketGroupCard from '../today/TicketGroupCard';
import EmptyState from './EmptyState';
import { fmtDur } from '../../lib/format';

const SYNC_TONE = {
  synced:  'success',
  partial: 'partial',
  skipped: 'skipped',
  failed:  'failed',
};
const SYNC_LABEL = {
  synced:  'Synced',
  partial: 'Partial',
  skipped: 'Skipped',
  failed:  'Failed',
};

const PROJ_COLORS = {
  PIM:      '#2563EB',
  ML:       '#10B981',
  CUMI:     '#F59E0B',
  INTERNAL: '#8B5CF6',
  OPS:      '#8B5CF6',
};

/** Format an ISO key (YYYY-MM-DD) into a human date line for the panel hero. */
function fmtDateLong(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Adapt a history-mock ticket to TicketGroupCard's prop shape. */
function adaptTicket(t) {
  return {
    jira_key:   t.key,
    title:      t.title,
    proj_name:  t.proj,
    minutes:    t.mins,
    slot_count: t.slots || 1,
    color:      PROJ_COLORS[t.proj] || 'var(--ac-text-subtle)',
    initial:    (t.proj || '?')[0],
    desc:       t.desc,
  };
}

export default function DaySummaryPanel({ day }) {
  if (!day) {
    return (
      <section className="day-panel" aria-live="polite">
        <EmptyState
          title="Pick a day."
          body="Choose a day from the rail to see what you logged."
        />
      </section>
    );
  }

  const tone = SYNC_TONE[day.sync] || 'info';
  const syncLabel = SYNC_LABEL[day.sync] || day.sync;
  const dateLabel = fmtDateLong(day.key);

  return (
    <section className="day-panel" aria-live="polite">
      <header className="panel-hero">
        <div className="panel-hero__left">
          <div className="panel-hero__eyebrow">My History</div>
          <h2 className="panel-hero__date" data-day-key={day.key}>{dateLabel}</h2>
          <div className="panel-meta">
            <StatusPill tone={tone} size="sm">{syncLabel}</StatusPill>
            <span className="panel-meta__total">
              <span className="panel-meta__num">{fmtDur(day.hrs)}</span>
              <span className="panel-meta__lbl">total</span>
            </span>
            {day.tickets?.length > 0 && (
              <span className="panel-meta__tickets">
                {day.tickets.length} {day.tickets.length === 1 ? 'ticket' : 'tickets'}
              </span>
            )}
          </div>
        </div>
      </header>

      {day.tickets?.length === 0 ? (
        <EmptyState
          title="No work logged."
          body="This was a weekend, leave, or holiday — nothing was synced for this day."
        />
      ) : (
        <div className="groups">
          {day.tickets.map((t) => (
            <TicketGroupCard key={t.key} group={adaptTicket(t)} />
          ))}
        </div>
      )}
    </section>
  );
}
