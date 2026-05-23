// SaveBar — sticky bottom bar with a status blob ("All saved" / "Unsaved
// changes" / "Saving…") and Save + Discard buttons. Shared by /settings and
// /admin/integrations.
//
// Props:
//   state       'saved' | 'dirty' | 'saving'
//   onSave      callback when the Save button is clicked
//   onDiscard   callback when the Discard button is clicked
//   savedHint   optional small hint shown under "All saved" (eg "Last saved · …")
//   primaryLabel  optional override for the primary button label (default "Save changes")
//   className   extra class names for the outer container (so pages can extend padding/margin)
//
// Status uses role="status" so AT announces transitions (saved → dirty → saving
// → saved) without spamming the user — role="status" is `aria-live=polite`.
// `role="alert"` is reserved for the surrounding page's error banner.

import '../../styles/settings-components.css';

const COPY = {
  saved:  { txt: 'All saved',          mini: 'Last saved · just now' },
  dirty:  { txt: 'Unsaved changes',    mini: 'You have edits' },
  saving: { txt: 'Saving…',            mini: 'Posting to your account' },
};

export default function SaveBar({
  state = 'saved',
  onSave,
  onDiscard,
  savedHint,
  primaryLabel = 'Save changes',
  className = '',
}) {
  const copy = COPY[state] || COPY.saved;
  const disabled = state === 'saved' || state === 'saving';

  return (
    <div className={`ac-save-bar ac-save-bar--${state} ${className}`}>
      <div className="ac-save-bar__inner">
        <div
          className="ac-save-bar__status"
          role="status"
          aria-live="polite"
        >
          <span className="ac-save-bar__dot" aria-hidden="true" />
          <div className="ac-save-bar__text">
            <span className="ac-save-bar__title">{copy.txt}</span>
            <span className="ac-save-bar__mini">
              {state === 'saved' && savedHint ? savedHint : copy.mini}
            </span>
          </div>
        </div>
        <div className="ac-save-bar__actions">
          <button
            type="button"
            className="ac-btn ac-btn--ghost"
            onClick={onDiscard}
            disabled={disabled}
          >
            Discard
          </button>
          <button
            type="button"
            className="ac-btn ac-btn--primary"
            onClick={onSave}
            disabled={disabled}
          >
            {state === 'saving' ? (
              <>
                <span className="ac-save-bar__spin" aria-hidden="true" />
                <span>Saving…</span>
              </>
            ) : (
              <span>{primaryLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
