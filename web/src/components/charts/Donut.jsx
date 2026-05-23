// Donut — Chart.js doughnut chart wrapper. Used by:
//   • P10 Management Dashboard (utilization split: logged / leave / untracked / holiday)
//
// Same lazy-import + cleanup contract as BarChart.jsx / TrendChart.jsx — Chart.js
// is only loaded when this component mounts, and the chart instance is destroyed
// on unmount AND re-created on every data change so React's view of the world
// stays in lockstep with Chart.js's.
//
// Props
//   labels      string[]    — segment labels (e.g. ['Logged','Leave','Untracked','Holiday'])
//   values      number[]    — segment magnitudes (same length as labels)
//   colors      string[]    — fill colour per segment (same length as labels)
//   centerLabel string|null — optional big text drawn in the middle (e.g. '83%')
//   centerSub   string|null — small line under centerLabel
//   ariaLabel   string      — required screen-reader summary
//   height      number      — container height in px (default: 220)
//
// We render the centre label via plain DOM (absolutely positioned over the
// canvas) instead of a Chart.js plugin. Simpler — one less moving part, and
// the text reflows with the container.

import { useEffect, useRef } from 'react';
import './charts.css';

export default function Donut({
  labels,
  values,
  colors,
  centerLabel = null,
  centerSub = null,
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
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          cutout: '64%',
          plugins: {
            legend: {
              display: true,
              position: 'right',
              align: 'center',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                padding: 10,
                font: { size: 11, family: 'Inter, ui-sans-serif, system-ui' },
              },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                  const v = ctx.parsed;
                  const pct = Math.round((v / total) * 100);
                  return ` ${ctx.label}: ${v} (${pct}%)`;
                },
              },
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
  }, [labels, values, colors]);

  return (
    <div className="ac-donut" style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel || 'Doughnut chart'} />
      {(centerLabel || centerSub) && (
        <div className="ac-donut__center" aria-hidden="true">
          {centerLabel && <div className="ac-donut__center-big">{centerLabel}</div>}
          {centerSub && <div className="ac-donut__center-sub">{centerSub}</div>}
        </div>
      )}
    </div>
  );
}
