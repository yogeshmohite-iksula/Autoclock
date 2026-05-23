// HoursBar — horizontal fill bar with an optional target marker.
// Used by P08 (Team Dashboard members table), P09 (Member Detail), P10 (Org).
//
// Props
//   value      number — current progress (minutes)
//   target     number — full target (minutes); fill is clamped to 100%
//   hue        string — fill colour. Per plan §5, never invent colours: pass the
//                       data's `hue` (project/team colour) here as inline style.
//   tone       'ok' | 'warn' | 'bad' — fallback colour token when hue is absent
//   showLabel  bool — show "Xh / Yh" caption beside the bar
//
// Body-class-agnostic styles in HoursBar.css.

import './HoursBar.css';

function fmtH(mins) {
  if (mins == null) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function HoursBar({ value = 0, target = 1, hue, tone, showLabel = false, ariaLabel }) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, target)) * 100));
  const fillStyle = {};
  if (hue) fillStyle.background = hue;
  fillStyle.width = `${pct}%`;
  const label = ariaLabel || `${fmtH(value)} of ${fmtH(target)}`;
  return (
    <div className={`ac-hours-bar${tone ? ` ac-hours-bar--${tone}` : ''}`} aria-label={label} role="progressbar"
         aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value, target)}>
      <div className="ac-hours-bar__track">
        <div className="ac-hours-bar__fill" style={fillStyle} />
      </div>
      {showLabel && (
        <span className="ac-hours-bar__label">
          <strong>{fmtH(value)}</strong> / {fmtH(target)}
        </span>
      )}
    </div>
  );
}
