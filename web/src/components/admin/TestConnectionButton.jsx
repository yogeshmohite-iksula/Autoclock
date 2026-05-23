// TestConnectionButton — encapsulates the test-connection lifecycle for a Jira
// project mapping. Used inline on the ProjectMappingRow's "Test" action and
// inside the MappingFormModal "Test connection" button.
//
// State machine: idle → testing → (ok | fail). Re-clicking resets to testing.
//
// a11y:
//   - The button has an accessible name that reflects the verb only ("Test").
//   - A visually-hidden aria-live="polite" span announces state transitions
//     ("Testing…", "Connection OK", "Connection failed") so screen-reader users
//     get the same feedback as sighted users (status never communicated by
//     colour alone — there's also a glyph + word in the visible pip).
//
// Props
//   jiraKey   string  — required. The Jira project key (e.g. "PIM"). Falsy keys
//                       short-circuit to a fail state.
//   onResult  (result: { ok, message }) => void — optional callback after a test
//                                                 settles. Useful for parent
//                                                 modals that need to gate Save.
//   className string  — optional, lets the parent layout the button.
//   label     string  — optional override for the button label (default "Test").
//   compact   bool    — if true, only the pip is shown (no label). Used by the
//                       row-level inline test. Default false.

import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import './TestConnectionButton.css';

const STATE_META = {
  idle:    { glyph: '○', label: '',                  className: 'is-idle'    },
  testing: { glyph: '⟳', label: 'Testing…',          className: 'is-testing' },
  ok:      { glyph: '✓', label: 'Connection OK',     className: 'is-ok'      },
  fail:    { glyph: '!', label: 'Connection failed', className: 'is-fail'    },
};

export default function TestConnectionButton({
  jiraKey,
  onResult,
  className = '',
  label = 'Test',
  compact = false,
}) {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const mountedRef = useRef(true);

  // Re-arm the mount flag on every (re-)mount. React 18 StrictMode mounts the
  // component, runs the cleanup once, then re-mounts — without re-arming this
  // here the in-flight test would think it had already unmounted and bail.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = async () => {
    setState('testing');
    setMessage('');
    try {
      const res = await api.admin.projects.test({ jiraKey });
      if (!mountedRef.current) return;
      const ok = !!(res && res.ok);
      const msg = (res && res.message) || (ok ? 'Connected.' : 'Failed.');
      setState(ok ? 'ok' : 'fail');
      setMessage(msg);
      onResult?.({ ok, message: msg });
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err?.message || 'Could not reach Jira.';
      setState('fail');
      setMessage(msg);
      onResult?.({ ok: false, message: msg });
    }
  };

  const meta = STATE_META[state] || STATE_META.idle;
  const isBusy = state === 'testing';

  return (
    <span className={`ac-testconn ${meta.className} ${className}`}>
      <button
        type="button"
        className="ac-testconn__btn"
        onClick={run}
        disabled={isBusy}
        aria-label={`${label} Jira connection${jiraKey ? ` for ${jiraKey}` : ''}`}
      >
        {!compact && <span className="ac-testconn__btn-label">{label}</span>}
        <span className="ac-testconn__pip" aria-hidden="true">
          <span className={`ac-testconn__pip-glyph ${isBusy ? 'is-spin' : ''}`}>{meta.glyph}</span>
        </span>
      </button>
      {/* Visually-hidden live region — only announces state changes. */}
      <span className="visually-hidden" aria-live="polite" role="status">
        {state === 'idle' ? '' : (message || meta.label)}
      </span>
    </span>
  );
}
