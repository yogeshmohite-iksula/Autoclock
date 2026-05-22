// Searchable Dropdown — used for Project + Jira-task selection in
// the LogSlotForm on TodayPage. Ported from docs/FrontEnd Design/today-app.jsx
// (the prototype's <Dropdown kind="..." />). Click-outside closes.

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * @param {object}  props
 * @param {'project'|'task'} props.kind
 * @param {number|null}      props.value     - selected option's `id`
 * @param {Array}            props.options   - projects or tasks
 * @param {(id:number)=>void} props.onChange
 * @param {string}           [props.placeholder]
 * @param {boolean}          [props.disabled]
 */
export default function Dropdown({ kind, value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => {
      if (kind === 'project') return (o.name || '').toLowerCase().includes(needle);
      return ((o.jira_key || '') + ' ' + (o.summary || '')).toLowerCase().includes(needle);
    });
  }, [options, q, kind]);

  const selected = options.find((o) => o.id === value);

  return (
    <div className={'tdy-dd ' + (open ? 'open' : '')} ref={ref}>
      <button
        type="button"
        className="tdy-dd-btn"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {kind === 'project' ? (
          <>
            <span
              className={'tdy-swatch ' + (selected ? '' : 'tdy-swatch--x')}
              style={selected ? { background: selected.color || 'var(--ac-text-subtle)' } : undefined}
            />
            {selected
              ? <span className="tdy-dd-label">{selected.name}</span>
              : <span className="tdy-dd-placeholder">{placeholder}</span>}
            <span className="tdy-dd-arr" aria-hidden="true">▾</span>
          </>
        ) : (
          <>
            <span className="tdy-swatch tdy-swatch--x" />
            {selected
              ? (
                <span className="tdy-ticket-line">
                  <span className="tdy-ticket-key">{selected.jira_key}</span>
                  <span className="tdy-ticket-desc">{selected.summary}</span>
                </span>
              )
              : <span className="tdy-dd-placeholder">{placeholder}</span>}
            <span className="tdy-dd-arr" aria-hidden="true">▾</span>
          </>
        )}
      </button>

      {open && (
        <div className="tdy-dd-panel" role="listbox">
          <div className="tdy-dd-search">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === 'project' ? 'Search projects…' : 'Search Jira tasks…'}
            />
          </div>
          {filtered.length === 0 && <div className="tdy-dd-empty">No matches</div>}
          {filtered.map((o) => (
            <div
              key={o.id}
              className="tdy-dd-opt"
              role="option"
              aria-selected={o.id === value}
              onClick={() => { onChange(o.id); setOpen(false); setQ(''); }}
            >
              {kind === 'project' ? (
                <>
                  <span className="tdy-swatch" style={{ background: o.color || 'var(--ac-text-subtle)' }} />
                  <span className="tdy-dd-opt-title">{o.name}</span>
                  {o.tag && <span className="tdy-dd-opt-meta">{o.tag}</span>}
                </>
              ) : (
                <>
                  <span className="tdy-swatch tdy-swatch--x" />
                  <span className="tdy-dd-opt-title">
                    <span className="tdy-ticket-key">{o.jira_key}</span>
                    <span className="tdy-dd-opt-name">{o.summary}</span>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
