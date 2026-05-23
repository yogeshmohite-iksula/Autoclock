// HistoryRailList — vertical list view of the 14-day history rail.
// Each row shows: weekday badge, day-of-month, an hours-bar (filled to the
// per-day total relative to the 8h target), and a sync-status pill.
//
// Body-class scoping: classes are generic (`.rail-row`, `.wd`, `.day`,
// `.hrs-bar`). The host (P07) owns all styles under `.page-history`.

import { fmtDur } from '../../lib/format';
import StatusPill from '../pills/StatusPill';

// 8-hour daily target = 480 minutes (matches CloseMyDayPage DAILY_TARGET_MINUTES).
const DAILY_TARGET_MIN = 480;

// Map the mock's `sync` enum onto StatusPill tones (OQ-AP-05 resolution —
// see prompt: 'synced'→'success', 'partial'→'partial', 'skipped'→'skipped',
// 'failed'→'failed'). Keep both word + dot — colour is never the sole signal.
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

export default function HistoryRailList({ days = [], selectedKey, onSelect }) {
  return (
    <ul className="rail-list" role="list">
      {days.map((d) => {
        const isSel = d.key === selectedKey;
        const pct = Math.min(100, Math.round((d.hrs / DAILY_TARGET_MIN) * 100));
        const tone = SYNC_TONE[d.sync] || 'info';
        const label = SYNC_LABEL[d.sync] || d.sync;
        return (
          <li key={d.key}>
            <button
              type="button"
              className={'rail-row' + (isSel ? ' is-selected' : '')}
              aria-current={isSel ? 'date' : undefined}
              aria-label={`${d.wd} ${d.day} — ${fmtDur(d.hrs)} logged, ${label}`}
              onClick={() => onSelect && onSelect(d.key)}
            >
              <span className="wd" aria-hidden="true">{d.wd}</span>
              <span className="day" aria-hidden="true">{d.day}</span>
              <span className="hrs">
                <span className="hrs-num">{fmtDur(d.hrs)}</span>
                <span className="hrs-bar" aria-hidden="true">
                  <span className="hrs-bar__fill" style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="sync-pill-slot">
                <StatusPill tone={tone} size="sm">{label}</StatusPill>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
