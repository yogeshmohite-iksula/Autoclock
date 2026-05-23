// RangeTabs — accessible tablist for the date range filter
// (today | week | sprint | month). Page owns URL state via `value/onChange`.
//
// a11y: `role="tablist"`; each tab has `role="tab"` + `aria-selected`. Keyboard:
// Left/Right arrows move focus, Home/End jump to ends. Enter/Space activates.
//
// Props
//   value     'today' | 'week' | 'sprint' | 'month'
//   onChange  (next: string) => void
//   options   optional override of the labels list

import { useRef } from 'react';
import './RangeTabs.css';

const DEFAULTS = [
  { value: 'today',  label: 'Today' },
  { value: 'week',   label: 'Week' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'month',  label: 'Month' },
];

export default function RangeTabs({ value = 'today', onChange, options = DEFAULTS, ariaLabel = 'Date range' }) {
  const refs = useRef({});

  const onKeyDown = (e, idx) => {
    const ks = e.key;
    if (ks !== 'ArrowLeft' && ks !== 'ArrowRight' && ks !== 'Home' && ks !== 'End') return;
    e.preventDefault();
    let nextIdx = idx;
    if (ks === 'ArrowLeft')  nextIdx = (idx - 1 + options.length) % options.length;
    if (ks === 'ArrowRight') nextIdx = (idx + 1) % options.length;
    if (ks === 'Home')       nextIdx = 0;
    if (ks === 'End')        nextIdx = options.length - 1;
    const next = options[nextIdx];
    refs.current[next.value]?.focus();
    onChange?.(next.value);
  };

  return (
    <div className="ac-range-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            ref={(el) => { refs.current[opt.value] = el; }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`ac-range-tabs__tab${selected ? ' is-selected' : ''}`}
            onClick={() => onChange?.(opt.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
