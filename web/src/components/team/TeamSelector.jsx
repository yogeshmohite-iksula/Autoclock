// TeamSelector — dropdown of teams accessible to the current PM/lead.
// PMs may lead exactly one team — in that case we render a static "label" form
// (not a button) so there's no confusing dead control.
//
// Props
//   teams        Array<{ id, name, color }>
//   value        currently selected team id (or null)
//   onChange(id) called when user picks a different team
//
// Used by P08 (Team Dashboard) and P09 (Team Member Detail) — keep generic.

import { useEffect, useId, useRef, useState } from 'react';
import './TeamSelector.css';

export default function TeamSelector({ teams = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = teams.find(t => t.id === value) || teams[0] || { id: null, name: '—', color: '#94A3B8' };

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Single-team PMs see a static label (no caret, no popover).
  if (teams.length <= 1) {
    return (
      <span className="ac-team-selector ac-team-selector--static" aria-label={`Team: ${selected.name}`}>
        <span className="ac-team-selector__sw" style={{ background: selected.color }} aria-hidden="true" />
        <span className="ac-team-selector__name">{selected.name}</span>
      </span>
    );
  }

  return (
    <div className="ac-team-selector-wrap">
      <button
        type="button"
        ref={triggerRef}
        className="ac-team-selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ac-team-selector__sw" style={{ background: selected.color }} aria-hidden="true" />
        <span id={labelId} className="ac-team-selector__name">{selected.name}</span>
        <span className="ac-team-selector__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul ref={popoverRef} className="ac-team-selector__menu" role="listbox" aria-labelledby={labelId}>
          {teams.map(t => (
            <li
              key={t.id}
              role="option"
              aria-selected={t.id === selected.id}
              tabIndex={0}
              className={`ac-team-selector__item${t.id === selected.id ? ' is-selected' : ''}`}
              onClick={() => { onChange?.(t.id); setOpen(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange?.(t.id);
                  setOpen(false);
                }
              }}
            >
              <span className="ac-team-selector__sw" style={{ background: t.color }} aria-hidden="true" />
              <span>{t.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
