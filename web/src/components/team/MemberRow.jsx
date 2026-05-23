// MemberRow — one row of the Team Dashboard members list.
//
// Renders as an <a href={`/team/${id}`}> so it's keyboard-activatable and reads
// correctly to screen readers (a single button-like row is preferable to a
// nested control). Whole row navigates to the detail page.
//
// Props
//   member: {
//     id, name, role, hue, initial,
//     today, week, target, weekTarget,
//     status:'logging'|'closed'|'partial'|'missing'|'leave',
//     lastClose
//   }
//   range  'today' | 'week' | 'sprint' | 'month' — drives which hour figure leads
//   variant 'row' | 'card' — desktop table row vs mobile card. Pages switch via CSS.

import { Link } from 'react-router-dom';
import HoursBar from './HoursBar';
import MemberStatusPill from './MemberStatusPill';
import { fmtDur } from '../../lib/format';
import './MemberRow.css';

export default function MemberRow({ member, range = 'today' }) {
  const m = member;
  const onleave = m.status === 'leave';
  // Lead figure: today for 'today' range, week otherwise.
  const leadValue  = range === 'today' ? m.today : m.week;
  const leadTarget = range === 'today' ? m.target : m.weekTarget;
  const hue = m.hue || '#2563EB';

  return (
    <Link
      to={`/team/${m.id}`}
      className={`ac-member-row${onleave ? ' is-on-leave' : ''}`}
      aria-label={`${m.name} — ${m.status === 'closed' ? 'closed' : m.status === 'logging' ? 'in progress' : m.status === 'partial' ? 'partial' : m.status === 'missing' ? 'not logged' : 'on leave'}, ${fmtDur(leadValue)} of ${fmtDur(leadTarget)} ${range}`}
    >
      <span className="ac-member-row__avatar" style={{ background: hue }} aria-hidden="true">
        {m.initial || (m.name && m.name[0]) || '·'}
      </span>
      <span className="ac-member-row__id">
        <span className="ac-member-row__name">{m.name}</span>
        <span className="ac-member-row__role">{m.role}</span>
      </span>
      <span className="ac-member-row__today" data-tone={m.status === 'missing' ? 'bad' : m.status === 'partial' ? 'warn' : ''}>
        <strong>{onleave ? '—' : fmtDur(m.today)}</strong>
        <span className="ac-member-row__of">/ {fmtDur(m.target)}</span>
      </span>
      <span className="ac-member-row__week">
        <strong>{fmtDur(m.week)}</strong>
        <span className="ac-member-row__of">/ {fmtDur(m.weekTarget)}</span>
      </span>
      <span className="ac-member-row__bar" aria-hidden="true">
        <HoursBar value={leadValue} target={leadTarget} hue={onleave ? '#94A3B8' : hue} />
      </span>
      <span className="ac-member-row__status">
        <MemberStatusPill status={m.status} />
      </span>
      <span className="ac-member-row__last">{m.lastClose || '—'}</span>
    </Link>
  );
}
