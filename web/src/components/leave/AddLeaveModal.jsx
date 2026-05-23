// AddLeaveModal — centred dialog (desktop) / full-screen sheet (mobile) for
// adding a leave entry. WCAG 2.1 AA: role="dialog" aria-modal, focus trap,
// ESC closes, returns focus to the trigger button. Backdrop-click also closes.

import { useEffect, useId, useRef, useState } from 'react';
import './AddLeaveModal.css';

const PEOPLE = [
  { id: 1, name: 'Aarav Mehta' },
  { id: 2, name: 'Anuja Patil' },
  { id: 3, name: 'Riya Shah' },
  { id: 4, name: 'Dev Kapoor' },
  { id: 5, name: 'Neel Joshi' },
  { id: 6, name: 'Sara Iyer' },
  { id: 7, name: 'Karan Bansal' },
  { id: 8, name: 'Priya Nair' },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddLeaveModal({ open, onClose, onSubmit, returnFocusTo }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const [pid, setPid]       = useState(String(PEOPLE[0].id));
  const [start, setStart]   = useState(todayIso());
  const [end, setEnd]       = useState(todayIso());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState(null);

  // Focus the first field when the modal opens, and trap focus inside.
  useEffect(() => {
    if (!open) return undefined;
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
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(focusOnce);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the trigger
      if (returnFocusTo && returnFocusTo.current) returnFocusTo.current.focus();
    };
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!start || !end || !reason.trim()) {
      setError('Please fill in start date, end date, and reason.');
      return;
    }
    if (end < start) {
      setError('End date must be on or after start date.');
      return;
    }
    setSubmitting(true);
    try {
      const person = PEOPLE.find(p => String(p.id) === String(pid));
      await onSubmit?.({
        pid: Number(pid),
        person: person ? person.name : '',
        start,
        end,
        reason: reason.trim(),
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not save leave.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="leave-modal-backdrop"
      onMouseDown={onBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="leave-modal"
      >
        <header className="leave-modal__head">
          <h2 id={titleId} className="leave-modal__title">Add leave</h2>
          <button
            type="button"
            className="leave-modal__close"
            onClick={onClose}
            aria-label="Close add-leave dialog"
          >
            ×
          </button>
        </header>
        <form className="leave-modal__form" onSubmit={handleSubmit}>
          <div className="leave-modal__field">
            <label htmlFor="leave-person" className="leave-modal__label">Person</label>
            <select
              id="leave-person"
              ref={firstFieldRef}
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              className="leave-modal__input"
              disabled={submitting}
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="leave-modal__row">
            <div className="leave-modal__field">
              <label htmlFor="leave-start" className="leave-modal__label">Start date</label>
              <input
                id="leave-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="leave-modal__input"
                disabled={submitting}
                required
              />
            </div>
            <div className="leave-modal__field">
              <label htmlFor="leave-end" className="leave-modal__label">End date</label>
              <input
                id="leave-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                min={start}
                className="leave-modal__input"
                disabled={submitting}
                required
              />
            </div>
          </div>
          <div className="leave-modal__field">
            <label htmlFor="leave-reason" className="leave-modal__label">Reason</label>
            <input
              id="leave-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family event, sick day…"
              className="leave-modal__input"
              disabled={submitting}
              required
            />
          </div>
          {error && (
            <div className="leave-modal__error" role="alert">{error}</div>
          )}
          <div className="leave-modal__actions">
            <button
              type="button"
              className="leave-modal__btn leave-modal__btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="leave-modal__btn leave-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
