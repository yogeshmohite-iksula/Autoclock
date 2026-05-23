// BarChart — Chart.js bar chart wrapper. Used by:
//   • P09 Team Member Detail (14-day hours bar chart)
//   • P10 Management Dashboard (planned — bar variants)
//
// Lazy-imports `chart.js/auto` so the dep is only fetched when a chart is
// actually rendered (saves first-paint cost on non-chart pages). The chart
// instance is destroyed on unmount and re-created on every data change to
// keep Chart.js's internal state in lockstep with React's.
//
// Props
//   labels       string[]                  — x-axis labels (e.g. ['MON','TUE',…])
//   values       number[]                  — bar heights, same length as labels
//   targetLine   number | null             — horizontal dashed line (e.g. 480 = 8h target)
//   targetLabel  string                    — legend label for the target line ('Target')
//   barLabel     string                    — legend label for the bars ('Logged')
//   yMax         number                    — optional clamp on the y-axis (default: auto)
//   yTickStepMin number                    — y-axis tick step in minutes (default: 60)
//   barColor     string                    — bar fill colour (CSS colour, default success)
//   targetColor  string                    — target line colour (CSS colour, default subtle)
//   ariaLabel    string                    — required summary for screen readers
//   height       number                    — container height in px (default: 260)

import { useEffect, useRef } from 'react';
import './charts.css';

export default function BarChart({
  labels,
  values,
  targetLine = null,
  targetLabel = 'Target',
  barLabel = 'Logged',
  yMax,
  yTickStepMin = 60,
  barColor = '#10B981',
  targetColor = 'rgba(100, 116, 139, 0.55)',
  ariaLabel,
  height = 260,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let local;

    (async () => {
      // Lazy import — avoids loading ~70 KB of Chart.js on routes that don't need it.
      const { default: Chart } = await import('chart.js/auto');
      if (cancelled || !canvasRef.current) return;

      // If a chart already exists on this canvas, tear it down before re-creating.
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const datasets = [
        {
          label: barLabel,
          data: values,
          backgroundColor: barColor,
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ];

      // Target line is drawn as a thin overlay dataset (Chart.js doesn't have
      // a first-class "horizontal line" — a typed line dataset is the simplest).
      if (targetLine != null) {
        datasets.push({
          type: 'line',
          label: targetLabel,
          data: labels.map(() => targetLine),
          borderColor: targetColor,
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        });
      }

      local = new Chart(canvasRef.current, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                font: { size: 11, family: 'JetBrains Mono, ui-monospace, monospace' },
              },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const v = ctx.parsed.y;
                  const h = Math.floor(v / 60);
                  const m = v % 60;
                  return ` ${ctx.dataset.label}: ${h}h${m ? ` ${m}m` : ''}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: 'JetBrains Mono, ui-monospace, monospace' } },
            },
            y: {
              beginAtZero: true,
              suggestedMax: yMax,
              ticks: {
                stepSize: yTickStepMin,
                font: { size: 10, family: 'JetBrains Mono, ui-monospace, monospace' },
                callback(v) {
                  if (v === 0) return '0';
                  const h = v / 60;
                  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
                },
              },
              grid: { color: 'rgba(100,116,139,0.12)' },
            },
          },
        },
      });
      chartRef.current = local;
    })();

    return () => {
      cancelled = true;
      // Prefer the closure-local instance — chartRef.current may have been
      // replaced by a newer re-render.
      if (local) local.destroy();
      if (chartRef.current === local) chartRef.current = null;
    };
  }, [labels, values, targetLine, targetLabel, barLabel, yMax, yTickStepMin, barColor, targetColor]);

  return (
    <div className="ac-chart" style={{ height }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel || 'Bar chart'}
      />
    </div>
  );
}
