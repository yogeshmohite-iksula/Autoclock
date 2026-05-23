// SegmentedRadio — an accessible segmented control.
// Implements `role="radiogroup"` with each option a `role="radio"` button
// and `aria-checked`. Keyboard: arrow-keys move focus + select.
// Used on /settings (cadence, density, fontSize) and /admin/integrations.
//
// Wraps onto multiple lines when narrow — see settings-components.css.
//
// Props:
//   id              unique id (for label association)
//   label           visible label (rendered above the group) — required
//   description     optional helper text
//   value           current value (one of `options[].value`)
//   options         [{ value, label }] — typed values preserved
//   onChange(v)     callback when the user picks a new value
//   name            optional name (used as aria-label fallback)

import { useCallback, useId, useRef } from 'react';

import '../../styles/settings-components.css';

export default function SegmentedRadio({
  id, label, description, value, options, onChange, name,
}) {
  const reactId = useId();
  const groupId = id || `seg-${reactId}`;
  const descId = description ? `${groupId}-desc` : undefined;
  const labelId = `${groupId}-label`;
  const btnsRef = useRef([]);

  const onKeyDown = useCallback((e) => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    const el = btnsRef.current[next];
    if (el && typeof el.focus === 'function') el.focus();
  }, [options, value, onChange]);

  return (
    <div className="ac-seg-wrap">
      {label ? (
        <div id={labelId} className="ac-seg-label">{label}</div>
      ) : null}
      {description ? (
        <div id={descId} className="ac-seg-desc">{description}</div>
      ) : null}
      <div
        className="ac-seg"
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? name : undefined}
        aria-describedby={descId}
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => { btnsRef.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className={`ac-seg__btn${selected ? ' is-on' : ''}`}
              onClick={() => onChange(o.value)}
            >
              <span className="ac-seg__dot" aria-hidden="true" />
              <span className="ac-seg__txt">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
