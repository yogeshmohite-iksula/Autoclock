// EmptyState — generic empty-state block. Used by P07 My History (right panel
// when a day has no logged tickets) and queued for re-use by P08 Team Dashboard
// + P12 Reminder History on "no data yet" branches.
//
// Body-class scoping: this component is class-only (`.empty-state`, `.empty-state__title`,
// `.empty-state__body`, `.empty-state__cta`). The host page owns the CSS under
// its own `.page-*` prefix to avoid generic-name collisions across pages.

export default function EmptyState({ title, body, cta = null, icon = null }) {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
      {title && <h2 className="empty-state__title">{title}</h2>}
      {body && <p className="empty-state__body">{body}</p>}
      {cta && <div className="empty-state__cta">{cta}</div>}
    </div>
  );
}
