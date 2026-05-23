// TrendChart — Chart.js line chart wrapper. Used by:
//   • P09 Team Member Detail (inline trend, small)
//   • P10 Management Dashboard (8-week trend, large)
//
// Same lazy-import + cleanup contract as BarChart.jsx. Pass `compact` to drop
// gridlines / shrink ticks for inline "trend strip" usage.
//
// Props
//   labels      string[]    — x-axis labels (e.g. weeks)
//   values      number[]    — point values
//   label       string      — dataset legend label
//   lineColor   string      — CSS colour for the line + point fill
//   fillColor   string      — translucent area fill below the line (optional)
//   compact     boolean     — hide gridlines + axes for inline display
//   ariaLabel   string      — screen reader summary
//   height      number      — container height in px (default: 220)

import { useEffect, useRef } from 'react';
import './charts.css';

export default function TrendChart({
  labels,
  values,
  label = 'Trend',
  lineColor = '#2563EB',
  fillColor = 'rgba(37,99,235,0.10)',
  compact = false,
  ariaLabel,
  height = 220,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let local;
    (async () => {
      const { default: Chart } = await import('chart.js/auto');
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      local = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label,
            data: values,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 2,
            pointRadius: compact ? 0 : 3,
            pointBackgroundColor: lineColor,
            tension: 0.30,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          plugins: {
            legend: { display: !compact, position: 'top', align: 'end' },
            tooltip: { enabled: !compact },
          },
          scales: {
            x: {
              display: !compact,
              grid: { display: false },
              ticks: { font: { size: 10, family: 'JetBrains Mono, ui-monospace, monospace' } },
            },
            y: {
              display: !compact,
              beginAtZero: true,
              grid: { color: 'rgba(100,116,139,0.12)' },
              ticks: { font: { size: 10, family: 'JetBrains Mono, ui-monospace, monospace' } },
            },
          },
        },
      });
      chartRef.current = local;
    })();

    return () => {
      cancelled = true;
      if (local) local.destroy();
      if (chartRef.current === local) chartRef.current = null;
    };
  }, [labels, values, label, lineColor, fillColor, compact]);

  return (
    <div className="ac-chart" style={{ height }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel || 'Line chart'} />
    </div>
  );
}
