// StatusPill — single component that replaces the 5 near-duplicate pills
// from the prototype (StatusPill / SyncPill / HealthPill / role-pill /
// member-status pill). One `tone` map → consistent colour-by-tokens, optional
// icon, optional dot-only "sm" variant. WCAG 2.1 AA — colour is never the
// sole signal: the `dot` is paired with text + an icon glyph for non-success.

import './StatusPill.css';

const TONE = {
  ok:        { glyph: '✓', label: 'OK' },
  success:   { glyph: '✓', label: 'Synced' },
  partial:   { glyph: '◐', label: 'Partial' },
  retrying:  { glyph: '⟳', label: 'Retrying' },
  failed:    { glyph: '!', label: 'Failed' },
  skipped:   { glyph: '—', label: 'Skipped' },
  warn:      { glyph: '!', label: 'Warn' },
  info:      { glyph: 'i', label: 'Info' },
  pending:   { glyph: '·', label: 'Pending' },
  idle:      { glyph: '○', label: 'Idle' },
};

/**
 * <StatusPill tone="success" size="md">Synced</StatusPill>
 * Sizes: 'sm' (dot + label) | 'md' (icon + label).
 * `children` overrides the default tone label.
 */
export default function StatusPill({ tone = 'info', size = 'md', children, role: ariaRole = 'status' }) {
  const t = TONE[tone] || TONE.info;
  const label = children ?? t.label;
  return (
    <span className={`ac-pill ac-pill--${tone} ac-pill--${size}`} role={ariaRole}>
      <span className="ac-pill__ic" aria-hidden="true">{size === 'sm' ? '' : t.glyph}</span>
      <span className="ac-pill__txt">{label}</span>
    </span>
  );
}
