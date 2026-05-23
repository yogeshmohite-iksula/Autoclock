// AlertBanner — inline alert / advisory banner. Used by:
//   • P09 Team Member Detail (e.g. "12h behind target" warning)
//   • P11 Compliance Console (planned — bulk send confirmations / live banners)
//
// `tone` drives both visuals and ARIA semantics:
//   - 'danger' / 'warn'  → role="alert"   (assertive — interrupts screen readers)
//   - 'info' / 'success' → role="status"  (polite — read after current speech)
//
// The banner is a 3-column grid: icon · body · optional action. On mobile the
// action wraps below the body. Body text always wraps; no min-width tricks.

import './AlertBanner.css';

const TONE_ICONS = {
  danger:  '!',
  warn:    '!',
  info:    'i',
  success: '✓',
};

export default function AlertBanner({
  tone = 'warn',
  title,
  body,
  action,        // optional { label, onClick, href }
  icon,          // optional ReactNode override for the icon glyph
}) {
  const isUrgent = tone === 'danger' || tone === 'warn';
  const role = isUrgent ? 'alert' : 'status';
  const ariaLive = isUrgent ? 'assertive' : 'polite';
  const glyph = icon != null ? icon : TONE_ICONS[tone] || 'i';

  return (
    <div className={`ac-alert ac-alert--${tone}`} role={role} aria-live={ariaLive}>
      <div className="ac-alert__ico" aria-hidden="true">{glyph}</div>
      <div className="ac-alert__body">
        {title && <div className="ac-alert__title">{title}</div>}
        {body && <div className="ac-alert__sub">{body}</div>}
      </div>
      {action && (
        action.href ? (
          <a className="ac-alert__cta" href={action.href}>{action.label}</a>
        ) : (
          <button type="button" className="ac-alert__cta" onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
