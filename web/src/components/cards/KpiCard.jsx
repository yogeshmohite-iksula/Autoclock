// KpiCard — reusable KPI card for dashboards. Used by:
//   • P08 Team Dashboard  (variant="default")
//   • P10 Management Dashboard (variant="default")
//   • P11 Compliance Console (variant="stat" — smaller stat row)
//
// Props
//   label   string  — uppercase eyebrow (becomes <h3>)
//   value   ReactNode — the big numeric body (e.g. "16h 30m" or "5")
//   sub     ReactNode — the muted second line (e.g. "of 56h target")
//   trend   { tone: 'ok'|'warn'|'bad'|'info', text: string } — small right-aligned chip
//   variant 'default' | 'stat' (stat is smaller for 4-up Compliance grid)
//   tone    'default' | 'ok' | 'warn' | 'alert' — colours the card background tint
//   foot    ReactNode — optional foot line (left/right baseline)
//
// Body-class-agnostic styles live in KpiCard.css. Pages may layer page-scoped
// CSS on top (e.g. `.page-team-dashboard .ac-kpi { … }`) for grid placement.

import './KpiCard.css';

export default function KpiCard({
  label,
  value,
  sub,
  trend,
  variant = 'default',
  tone = 'default',
  foot,
  ariaLabel,
}) {
  return (
    <div
      className={`ac-kpi ac-kpi--${variant} ac-kpi--tone-${tone}`}
      role="group"
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
    >
      <div className="ac-kpi__head">
        {label && <h3 className="ac-kpi__label">{label}</h3>}
        {trend && (
          <span className={`ac-kpi__trend ac-kpi__trend--${trend.tone || 'info'}`}>
            {trend.text}
          </span>
        )}
      </div>
      <div className="ac-kpi__value-row">
        <span className="ac-kpi__value" aria-label={typeof value === 'string' || typeof value === 'number' ? `${label || ''} ${value}` : undefined}>
          {value}
        </span>
        {sub && <span className="ac-kpi__sub">{sub}</span>}
      </div>
      {foot && <div className="ac-kpi__foot">{foot}</div>}
    </div>
  );
}
