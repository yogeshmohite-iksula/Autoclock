// InviteUserModal — modal dialog for inviting a new user.
// Fields: Full name, Iksula email, Role (radio), Team (select).
//
// a11y: role="dialog" aria-modal="true", focus trap, ESC to close, returns
// focus to the trigger button. Backdrop-click also closes. Full-screen sheet
// on mobile. Mirrors the AddLeaveModal (P13) pattern.

import { useEffect, useId, useRef, useState } from 'react';
import './InviteUserModal.css';

const ROLES = [
  { value: 'employee',   label: 'Employee' },
  { value: 'pm_lead',    label: 'PM Lead' },
  { value: 'management', label: 'Management' },
  { value: 'operations', label: 'Operations' },
  { value: 'admin',      label: 'Admin' },
];

const DEFAULT_TEAMS = [
  { id: 'pim',     name: 'PIMCore' },
  { id: 'me',      name: 'Modern Electronics' },
  { id: 'cumi',    name: 'CUMI' },
  { id: 'ops',     name: 'Ops' },
  { id: 'lead',    name: 'Leadership' },
];

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function InviteUserModal({
  open,
  onClose,
  onSubmit,
  returnFocusTo,
  teams = DEFAULT_TEAMS,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState('employee');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState(null);

  // Reset state + trap focus when opening.
  useEffect(() => {
    if (!open) return undefined;
    setName('');
    setEmail('');
    setRole('employee');
    setTeamId(teams[0]?.id || '');
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
  }, [open, onClose, returnFocusTo, teams]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError('Please enter a full name.');
      return;
    }
    if (!trimmedEmail || !validEmail(trimmedEmail)) {
      setError('Please enter a valid Iksula email.');
      return;
    }
    setSubmitting(true);
    try {
      const team = teams.find(t => String(t.id) === String(teamId));
      await onSubmit?.({
        name: trimmedName,
        email: trimmedEmail,
        role,
        teamId,
        team: team ? team.name : '',
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not send invite.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="ac-invite-modal-backdrop"
      onMouseDown={onBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ac-invite-modal"
      >
        <header className="ac-invite-modal__head">
          <h2 id={titleId} className="ac-invite-modal__title">Invite a new user</h2>
          <button
            type="button"
            className="ac-invite-modal__close"
            onClick={onClose}
            aria-label="Close invite dialog"
          >
            ×
          </button>
        </header>

        <form className="ac-invite-modal__form" onSubmit={handleSubmit}>
          <div className="ac-invite-modal__field">
            <label htmlFor="invite-name" className="ac-invite-modal__label">Full name</label>
            <input
              id="invite-name"
              ref={firstFieldRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Mehta"
              className="ac-invite-modal__input"
              disabled={submitting}
              autoComplete="off"
              required
            />
          </div>

          <div className="ac-invite-modal__field">
            <label htmlFor="invite-email" className="ac-invite-modal__label">Iksula email</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@iksula.com"
              className="ac-invite-modal__input"
              disabled={submitting}
              autoComplete="off"
              required
            />
          </div>

          <fieldset className="ac-invite-modal__field ac-invite-modal__radio-group">
            <legend className="ac-invite-modal__label">Role</legend>
            {ROLES.map((r) => (
              <label key={r.value} className="ac-invite-modal__radio">
                <input
                  type="radio"
                  name="invite-role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  disabled={submitting}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="ac-invite-modal__field">
            <label htmlFor="invite-team" className="ac-invite-modal__label">Team</label>
            <select
              id="invite-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="ac-invite-modal__input"
              disabled={submitting}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="ac-invite-modal__error" role="alert">{error}</div>
          )}

          <div className="ac-invite-modal__actions">
            <button
              type="button"
              className="ac-invite-modal__btn ac-invite-modal__btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ac-invite-modal__btn ac-invite-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
