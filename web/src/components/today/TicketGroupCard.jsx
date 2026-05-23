// TicketGroupCard — a single Jira-key row showing the tidied/merged description,
// optional "N slots merged" tag, project chip + duration. Used by:
//   • P04 Close My Day (preview rows)
//   • P07 My History  (per-day expanded ticket list)
//
// Visual fidelity targets the `.group` rule in docs/FrontEnd Design /Close My Day.html.
// The page that hosts the card owns the body-scoped CSS — selectors live under
// `.page-close-my-day .group` / `.page-my-history .group`. This file is class-only;
// no styles imported here.

import JiraGlyph from '../glyphs/JiraGlyph';
import { fmtDur } from '../../lib/format';

/**
 * @param {object} props
 *   - group       { proj_name, jira_key, title, minutes, slot_count, color, initial, slots, lines, time_meta? }
 *   - showJiraGlyph (default true) — hide on history rows where the day already has a sync pill
 */
export default function TicketGroupCard({ group, showJiraGlyph = true }) {
  if (!group) return null;
  const {
    jira_key,
    minutes,
    slot_count = 1,
    title = jira_key,
    proj_name = '',
    color,
    initial,
    slots = [],
    lines = [],
    time_meta,
  } = group;

  // Description: prefer an explicit `desc` field if the backend provides one;
  // otherwise join the per-slot descriptions (tidied by the parser in real EP-12).
  const desc = group.desc
    || (Array.isArray(lines) && lines.length ? lines.join(' · ') : '');

  // time_meta: design wants "08:30–10:00 · 14:30–15:00" — derive from slot timestamps.
  const meta = time_meta || (slots.length ? slots.join(' · ') : '');

  return (
    <div className="group" style={{ '--proj-color': color || 'var(--ac-text-subtle)' }}>
      <div className="ic" aria-hidden="true">{initial || (proj_name[0] || 'X').toUpperCase()}</div>
      <div className="body">
        <div className="top-row">
          <a className="ticket" href="#" onClick={(e) => e.preventDefault()}>
            {showJiraGlyph && <JiraGlyph size={12} />}
            <span>{jira_key}</span>
          </a>
          <span className="ticket-title">{title}</span>
          {proj_name && <span className="proj-name">· {proj_name}</span>}
          {slot_count > 1 && (
            <span className="merged">{slot_count} slots merged</span>
          )}
        </div>
        {desc && (
          <div className="desc">
            {desc}
            {meta && <span className="meta-time">{meta}</span>}
          </div>
        )}
      </div>
      <div className="dur">
        {fmtDur(minutes)}
        <span className="lbl">duration</span>
      </div>
    </div>
  );
}
