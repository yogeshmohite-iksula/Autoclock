// BulkActionBar — selected-count + primary action button.
// Used by:
//   • P11 Compliance Console (selected employees → Send Reminders)
//   • P14 Users and Roles, P15 Project Mapping (planned)
//
// a11y: `role="region"` with `aria-label="Bulk actions"` so SR users can
// jump to it when the count changes (the count is also announced via
// `aria-live="polite"` on the count node).

import './BulkActionBar.css';

/**
 * @param {object} props
 *   count       number               — number of items currently selected
 *   action      string               — primary button label
 *   onAction    () => void
 *   busy        boolean              — disables the button + shows pending state
 *   secondary   { label, onClick }   — optional secondary action (e.g. Cancel)
 *   tone        'primary'|'danger'   — primary button colour (defaults to primary)
 *   itemLabel   string               — singular noun for the items (default 'selected')
 */
export default function BulkActionBar({
  count,
  action,
  onAction,
  busy = false,
  secondary,
  tone = 'primary',
  itemLabel = 'selected',
}) {
  if (!count || count <= 0) return null;

  return (
    <div
      className={`ac-bulk-bar ac-bulk-bar--${tone}`}
      role="region"
      aria-label="Bulk actions"
    >
      <div className="ac-bulk-bar__count" aria-live="polite">
        <span className="ac-bulk-bar__count-num">{count}</span>
        <span className="ac-bulk-bar__count-lbl">{itemLabel}</span>
      </div>
      <div className="ac-bulk-bar__actions">
        {secondary && (
          <button
            type="button"
            className="ac-bulk-bar__btn ac-bulk-bar__btn--ghost"
            onClick={secondary.onClick}
          >
            {secondary.label}
          </button>
        )}
        <button
          type="button"
          className={`ac-bulk-bar__btn ac-bulk-bar__btn--${tone}`}
          onClick={onAction}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? 'Working…' : action}
        </button>
      </div>
    </div>
  );
}
