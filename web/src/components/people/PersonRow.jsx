// PersonRow — selectable, descriptive row for a person (employee).
// Used by:
//   • P11 Compliance Console (selectable checkbox + week-logged/target + status pill + send button)
//   • P12 Reminder History    (recipient row — non-selectable; uses `selected={undefined}`)
//   • P14 Users and Roles     (optional wrap target — admin row may build on this shape)
//
// On desktop the layout is a horizontal row: checkbox · avatar+name · team · logged/target · gap · status · action.
// On mobile the row stacks into a card: checkbox top-left, action top-right, body in 2 lines.
//
// Props
//   person       { id, name, role?, team?, email?, hue?, initial?, weekTarget?, logged?, gap?, leave?, status? }
//   selected     boolean | undefined    — undefined → no checkbox rendered (P12)
//   onSelectChange (next: boolean) => void
//   statusPill   ReactNode              — optional pre-rendered <StatusPill>
//   action       ReactNode              — optional right-side button (e.g. "Send")
//   meta         ReactNode              — optional extra dim meta line under the name (P12: "8h gap")
//   ariaLabel    string                 — override accessible name for the row

import './PersonRow.css';

function initialsOf(p) {
  if (p?.initial) return p.initial.toUpperCase().slice(0, 2);
  const name = p?.name || '';
  return name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(s => s[0].toUpperCase()).join('') || '?';
}

export default function PersonRow({
  person,
  selected,
  onSelectChange,
  statusPill,
  action,
  meta,
  ariaLabel,
}) {
  if (!person) return null;
  const showCheckbox = typeof selected === 'boolean';
  const hue = person.hue || '#64748B';
  const init = initialsOf(person);

  // Format week-logged / target as `Xh / Yh` with a small "gap" hint (PRD).
  const hasHours = person.weekTarget != null && person.logged != null;
  const hours = hasHours ? `${person.logged}h / ${person.weekTarget}h` : null;
  const gapMins = person.gap != null ? person.gap : (hasHours ? Math.max(0, person.weekTarget - person.logged) : null);

  return (
    <div
      className={`ac-personrow${selected ? ' is-selected' : ''}${showCheckbox ? ' has-check' : ''}`}
      role="group"
      aria-label={ariaLabel || person.name}
    >
      {showCheckbox && (
        <label className="ac-personrow__check">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            aria-label={`Select ${person.name}`}
          />
          <span aria-hidden="true" className="ac-personrow__check-box" />
        </label>
      )}

      <div className="ac-personrow__avatar" style={{ background: hue }} aria-hidden="true">{init}</div>

      <div className="ac-personrow__id">
        <div className="ac-personrow__name">{person.name}</div>
        <div className="ac-personrow__sub">
          {person.role && <span className="ac-personrow__role">{person.role}</span>}
          {person.team && <span className="ac-personrow__team">· {person.team}</span>}
          {meta && <span className="ac-personrow__meta"> · {meta}</span>}
        </div>
      </div>

      {hours && (
        <div className="ac-personrow__hours">
          <span className="ac-personrow__hours-val">{hours}</span>
          {gapMins != null && gapMins > 0 && (
            <span className="ac-personrow__gap" aria-label={`${gapMins} hours under target`}>
              {gapMins}h gap
            </span>
          )}
        </div>
      )}

      {statusPill && <div className="ac-personrow__status">{statusPill}</div>}
      {action && <div className="ac-personrow__action">{action}</div>}
    </div>
  );
}
