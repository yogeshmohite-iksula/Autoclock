// WarningPill — soft amber or hard red banner with an icon, title, optional
// sub-line and an optional action button. Used on:
//   • P04 Close My Day  — overlap / blocked-over-24h banners
//   • P11 Compliance     — under-target / behind banners
// Per ERD §11 + frontend rule "status never communicated by colour alone" —
// the leading "!" icon + role="alert" carry the meaning when colours fail.

import './WarningPill.css';

export default function WarningPill({ tone = 'amber', title, sub, action, children }) {
  return (
    <div className={`ac-warn ac-warn--${tone}`} role="alert">
      <div className="ac-warn__ic" aria-hidden="true">!</div>
      <div className="ac-warn__body">
        {title && <div className="ac-warn__title">{title}</div>}
        {sub && <div className="ac-warn__sub">{sub}</div>}
        {children}
      </div>
      {action && <div className="ac-warn__action">{action}</div>}
    </div>
  );
}
