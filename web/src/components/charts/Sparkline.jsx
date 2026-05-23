// Sparkline — tiny inline trend indicator. Used by:
//   • P09 Team Member Detail (KPI delta sparkline — optional)
//   • P10 Management Dashboard (per-team sparkline on team-cards)
//
// SVG-only — no Chart.js. The whole point of a sparkline is "draw a 60×16
// strip with one line and zero axes/legend"; spinning up a Chart.js instance
// per row of P10's team-card grid is wasteful. Same visual story can be told
// with a single <path>.
//
// Props
//   values    number[]   — series points; length 2+ recommended
//   width     number     — SVG width in px (default 80)
//   height    number     — SVG height in px (default 22)
//   color     string     — stroke colour (CSS colour; default primary blue)
//   areaFill  string|null — translucent area-fill colour or null for line-only
//   ariaLabel string     — screen reader summary

export default function Sparkline({
  values,
  width = 80,
  height = 22,
  color = '#2563EB',
  areaFill = 'rgba(37,99,235,0.12)',
  ariaLabel,
}) {
  if (!values || values.length < 2) {
    // Render an empty 0-line so layouts don't jump.
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel || 'no data'} className="ac-sparkline">
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="#cbd5e1" strokeWidth="1" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // guard against flat lines
  const pad = 2;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = areaFill
    ? `${line} L ${points[points.length - 1][0].toFixed(2)} ${height - pad} L ${points[0][0].toFixed(2)} ${height - pad} Z`
    : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel || `Trend with ${values.length} points, low ${min}, high ${max}`}
      className="ac-sparkline"
    >
      {area && <path d={area} fill={areaFill} stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
