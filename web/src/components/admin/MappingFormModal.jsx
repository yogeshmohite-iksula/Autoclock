// MappingFormModal — modal dialog for adding or editing a project mapping.
// Fields: Project name, Jira project key, Description, Kind (radio CLIENT/INTERNAL).
// Hosts a TestConnectionButton that streams testState: idle | testing | ok | fail.
//
// a11y: role="dialog" aria-modal="true", focus trap, ESC to close, returns
// focus to the trigger button. Backdrop-click also closes. Full-screen sheet
// on mobile. Mirrors the InviteUserModal (P14) pattern.
//
// Props
//   open        bool
//   mode        'add' | 'edit'   — affects title + verb only
//   initial     { id?, name?, key?, desc?, kind? } — used in edit mode to pre-fill
//   onClose     () => void
//   onSubmit    (payload, { mode, initial }) => Promise<void>
//   returnFocusTo  ref<HTMLElement>  — focus to restore after close

import { useEffect, useId, useRef, useState } from 'react';
import TestConnectionButton from './TestConnectionButton';
import './MappingFormModal.css';

const KINDS = [
  { value: 'CLIENT',   label: 'Client' },
  { value: 'INTERNAL', label: 'Internal' },
];

export default function MappingFormModal({
  open,
  mode = 'add',
  initial = null,
  onClose,
  onSubmit,
  returnFocusTo,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  const [name, setName]   = useState('');
  const [key,  setKey]    = useState('');
  const [desc, setDesc]   = useState('');
  const [kind, setKind]   = useState('CLIENT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset + populate fields when the modal opens.
  useEffect(() => {
    if (!open) return undefined;
    setName(initial?.name || '');
    setKey(initial?.key || '');
    setDesc(initial?.desc || '');
    setKind(initial?.kind || 'CLIENT');
    setError(null);
    setSubmitting(false);

    const focusOnce = window.requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(focusOnce);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (returnFocusTo && returnFocusTo.current) returnFocusTo.current.focus();
    };
  }, [open, onClose, returnFocusTo, initial]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedKey  = key.trim().toUpperCase();
    const trimmedDesc = desc.trim();
    if (!trimmedName) {
      setError('Please enter a project name.');
      return;
    }
    if (!trimmedKey) {
      setError('Please enter a Jira project key (e.g. PIM).');
      return;
    }
    if (!/^[A-Z][A-Z0-9]+$/.test(trimmedKey)) {
      setError('Jira keys are upper-case letters/digits (e.g. PIM, ML, INT2).');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit?.(
        { name: trimmedName, jiraKey: trimmedKey, desc: trimmedDesc, kind },
        { mode, initial }
      );
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not save the mapping.');
      setSubmitting(false);
    }
  };

  const title = mode === 'edit' ? 'Edit mapping' : 'Add mapping';
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add mapping';
  const submittingLabel = mode === 'edit' ? 'Saving…' : 'Adding…';

  return (
    <div
      className="ac-mapping-modal-backdrop"
      onMouseDown={onBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ac-mapping-modal"
      >
        <header className="ac-mapping-modal__head">
          <h2 id={titleId} className="ac-mapping-modal__title">{title}</h2>
          <button
            type="button"
            className="ac-mapping-modal__close"
            onClick={onClose}
            aria-label="Close mapping dialog"
          >
            ×
          </button>
        </header>

        <form className="ac-mapping-modal__form" onSubmit={handleSubmit}>
          <div className="ac-mapping-modal__field">
            <label htmlFor="mapping-name" className="ac-mapping-modal__label">Project name</label>
            <input
              id="mapping-name"
              ref={firstFieldRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SiteOne PIMCore"
              className="ac-mapping-modal__input"
              disabled={submitting}
              autoComplete="off"
              required
            />
          </div>

          <div className="ac-mapping-modal__field">
            <label htmlFor="mapping-key" className="ac-mapping-modal__label">Jira project key</label>
            <input
              id="mapping-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="PIM"
              className="ac-mapping-modal__input ac-mapping-modal__input--mono"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <span className="ac-mapping-modal__hint">
              Upper-case key from your Jira workspace. Worklogs will land on this project.
            </span>
          </div>

          <div className="ac-mapping-modal__field">
            <label htmlFor="mapping-desc" className="ac-mapping-modal__label">Description</label>
            <input
              id="mapping-desc"
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this project? (one line)"
              className="ac-mapping-modal__input"
              disabled={submitting}
              autoComplete="off"
            />
          </div>

          <fieldset className="ac-mapping-modal__field ac-mapping-modal__radio-group">
            <legend className="ac-mapping-modal__label">Kind</legend>
            {KINDS.map((k) => (
              <label key={k.value} className="ac-mapping-modal__radio">
                <input
                  type="radio"
                  name="mapping-kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => setKind(k.value)}
                  disabled={submitting}
                />
                <span>{k.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="ac-mapping-modal__field ac-mapping-modal__test-row">
            <span className="ac-mapping-modal__label">Test connection</span>
            <TestConnectionButton
              jiraKey={key.trim().toUpperCase()}
              label="Test connection"
              className="ac-mapping-modal__test-btn"
            />
            <span className="ac-mapping-modal__hint">
              Sends one read-only ping to Jira to confirm the key is reachable.
            </span>
          </div>

          {error && (
            <div className="ac-mapping-modal__error" role="alert">{error}</div>
          )}

          <div className="ac-mapping-modal__actions">
            <button
              type="button"
              className="ac-mapping-modal__btn ac-mapping-modal__btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ac-mapping-modal__btn ac-mapping-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
