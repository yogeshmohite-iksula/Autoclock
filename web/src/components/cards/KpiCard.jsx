// KpiCard — reusable KPI card for dashboards. Used by:
//   • P08 Team Dashboard  (variant="default")
//   • P09 Team Member Detail (variant="metric" — with delta arrow)
//   • P10 Management Dashboard (variant="default")
//   • P11 Compliance Console (variant="stat" — smaller stat row)
//
// Props
//   label   string  — uppercase eyebrow (becomes <h3>)
//   value   ReactNode — the big numeric body (e.g. "16h 30m" or "5")
//   sub     ReactNode — the muted second line (e.g. "of 56h target")
//   trend   { tone: 'ok'|'warn'|'bad'|'info', text: string } — small right-aligned chip
//   variant 'default' | 'stat' | 'metric' (metric: P09 — delta arrow on the label line)
//   tone    'default' | 'ok' | 'warn' | 'alert' — colours the card background tint
//   foot    ReactNode — optional foot line (left/right baseline)
//   delta   { value: string, direction: 'up'|'down'|'flat', tone?: 'ok'|'warn'|'bad' }
//             — small numeric delta with arrow glyph, top-right of the label line.
//             Used by the P09 metric variant. Strings only — the caller formats.
//
// Body-class-agnostic styles live in KpiCard.css. Pages may layer page-scoped
// CSS on top (e.g. `.page-team-dashboard .ac-kpi { … }`) for grid placement.

import './KpiCard.css';

const DELTA_GLYPH = { up: '▲', down: '▼', flat: '–' };

export default function KpiCard({
  label,
  value,
  sub,
  trend,
  variant = 'default',
  tone = 'default',
  foot,
  delta,
  ariaLabel,
}) {
  // The metric variant prefers a delta chip over a trend chip on the head row.
  // If both are supplied, delta wins (it's the more specific signal).
  const showDelta = !!(delta && delta.value != null);
  const deltaTone = (delta && delta.tone)
    || (delta && delta.direction === 'up' ? 'ok'
       : delta && delta.direction === 'down' ? 'bad'
       : 'info');
  const deltaGlyph = (delta && DELTA_GLYPH[delta.direction]) || '';

  return (
    <div
      className={`ac-kpi ac-kpi--${variant} ac-kpi--tone-${tone}`}
      role="group"
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
    >
      <div className="ac-kpi__head">
        {label && <h3 className="ac-kpi__label">{label}</h3>}
        {showDelta ? (
          <span
            className={`ac-kpi__delta ac-kpi__delta--${deltaTone}`}
            aria-label={`Delta ${delta.direction || 'flat'} ${delta.value}`}
          >
            {deltaGlyph && <span className="ac-kpi__delta-arrow" aria-hidden="true">{deltaGlyph}</span>}
            {delta.value}
          </span>
        ) : trend && (
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
