// UserTableRow — full user row used on P14 Users & Roles.
// Desktop: a 7-column horizontal grid row.
//   [avatar+name+email] [role-chip] [team] [conn-dots] [status-pill] [last-seen] [actions]
// Mobile: stacks into a vertical card — 4 rows (see CSS).
//
// a11y: rendered as `role="row"` with `<button>`s for actions. Status is
// communicated by icon+text+colour (not colour alone).
//
// Props
//   user:     { id, name, email, role, team, status, conn:{jira,google}, joined, initial, hue, me? }
//   onEdit:   (user) => void
//   onDisable:(user) => void
//   isMe:     boolean — adds an "It's you" tag (optional decoration)

import RoleChip from './RoleChip';
import ConnectionDotsInline from './ConnectionDotsInline';
import './UserTableRow.css';

function initialsOf(u) {
  if (u?.initial) return u.initial.toUpperCase().slice(0, 2);
  const name = u?.name || '';
  return name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(s => s[0].toUpperCase()).join('') || '?';
}

function fmtLastSeen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META = {
  active:   { tone: 'ok',   label: 'Active' },
  invited:  { tone: 'warn', label: 'Invited' },
  pending:  { tone: 'warn', label: 'Pending' },
  disabled: { tone: 'bad',  label: 'Disabled' },
};

export default function UserTableRow({ user, onEdit, onDisable }) {
  if (!user) return null;
  const init = initialsOf(user);
  const hue  = user.hue || '#64748B';
  const statusMeta = STATUS_META[user.status] || { tone: 'info', label: user.status || 'Unknown' };
  const isDisabled = user.status === 'disabled';

  return (
    <div
      className={`ac-user-row${isDisabled ? ' is-disabled' : ''}`}
      role="row"
      aria-label={`User ${user.name}`}
      data-user-id={user.id}
    >
      <div className="ac-user-row__person" role="cell">
        <span
          className="ac-user-row__avatar"
          style={{ background: hue }}
          aria-hidden="true"
        >
          {init}
        </span>
        <span className="ac-user-row__id">
          <span className="ac-user-row__name">
            {user.name}
            {user.me && <span className="ac-user-row__me-tag" aria-label="It's you">you</span>}
          </span>
          <span className="ac-user-row__email">{user.email}</span>
        </span>
      </div>

      <div className="ac-user-row__role" role="cell">
        <RoleChip role={user.role} />
      </div>

      <div className="ac-user-row__team" role="cell">{user.team || '—'}</div>

      <div className="ac-user-row__conn" role="cell">
        <ConnectionDotsInline conn={user.conn} />
      </div>

      <div className="ac-user-row__status" role="cell">
        <span
          className={`ac-user-row__status-pill ac-user-row__status-pill--${statusMeta.tone}`}
          role="status"
        >
          <span className="ac-user-row__status-icon" aria-hidden="true">
            {statusMeta.tone === 'ok' ? '●' : statusMeta.tone === 'warn' ? '◐' : statusMeta.tone === 'bad' ? '○' : '·'}
          </span>
          {statusMeta.label}
        </span>
      </div>

      <div className="ac-user-row__last-seen" role="cell">
        {fmtLastSeen(user.joined)}
      </div>

      <div className="ac-user-row__actions" role="cell">
        <button
          type="button"
          className="ac-user-row__btn ac-user-row__btn--ghost"
          onClick={() => onEdit?.(user)}
          aria-label={`Edit ${user.name}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="ac-user-row__btn ac-user-row__btn--ghost"
          onClick={() => onDisable?.(user)}
          disabled={isDisabled}
          aria-label={isDisabled ? `${user.name} is already disabled` : `Disable ${user.name}`}
        >
          {isDisabled ? 'Disabled' : 'Disable'}
        </button>
      </div>
    </div>
  );
}
