// SignInPage (P01) — Iksula Google Workspace sign-in screen.
// Ported from docs/FrontEnd Design /Sign In.html. Tweak panel,
// data-comment-anchor, scenario state, in-browser Babel all removed.
//
// Prototype tweak `state: default/loading/error` → real component state.
// Prototype `showConnects` → always on. `showFirstRun` → URL query
// `?welcome=1` (sent by Iksula's invite emails) or off.

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useISTClock } from '../hooks/useISTClock';
import Logomark from '../components/Logomark';

import '../styles/sign-in.css';

const DEMO_EMAIL = 'yogesh.mohite@iksula.com';  // mock-only — real prod uses Google OIDC redirect

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthed, onboardingComplete } = useAuth();
  const ist = useISTClock();

  const [state, setState] = useState('default');           // 'default' | 'loading' | 'error'
  const showFirstRun = new URLSearchParams(location.search).get('welcome') === '1';

  // If already authed, redirect upward.
  useEffect(() => {
    if (isAuthed) navigate(onboardingComplete ? '/today' : '/onboarding', { replace: true });
  }, [isAuthed, onboardingComplete, navigate]);

  const onSignIn = useCallback(async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const user = await signIn(DEMO_EMAIL);
      navigate(user?.onboarding_status === 'connected' ? '/today' : '/onboarding', { replace: true });
    } catch {
      setState('error');
    }
  }, [state, signIn, navigate]);

  // `G` keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.key?.toLowerCase() !== 'g') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      onSignIn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSignIn]);

  return (
    <div className="signin-shell">
      {/* Backgrounds — match the prototype default ("photo" aurora). The asset
          is shipped at web/public/assets/bg-soft.png (extracted from the bundle). */}
      <div className="bg-layer bg-photo" />
      <div className="bg-layer bg-photo-overlay" />

      {/* Corner chrome */}
      <div className="chrome">
        <div className="chrome-tl">
          <span className="wordmark"><span className="dot" />AutoClock</span>
        </div>
        <div className="chrome-tr">
          <span className="status-line">
            <span className="pulse" />
            <span>iksula · internal</span>
            <span style={{ opacity: 0.45 }}>•</span>
            <span>IST&nbsp;{ist.hm}:{ist.s}</span>
          </span>
        </div>
        <div className="chrome-bl">
          <div className="footer-line">
            <strong>An internal Iksula tool.</strong>{' '}
            Logs flow to Jira, Google Sheets &amp; Gmail — never elsewhere.
          </div>
        </div>
        <div className="chrome-br">
          <span className="kbd-hint">
            <span>press</span><span className="kbd">G</span><span>to sign in</span>
          </span>
        </div>
      </div>

      {/* Centred card */}
      <div className="signin-center">
        <div className="signin-stack">
          <section className="signin-card" aria-labelledby="signin-h1">
            <Logomark />
            <h1 id="signin-h1" className="signin-brand">AutoClock</h1>
            <p className="signin-tagline">Log your whole workday in one click.</p>

            <GoogleButton state={state} onClick={onSignIn} />

            <div className="signin-helper">
              Use your <span className="at">@iksula.com</span> account
            </div>

            {state === 'error' && <ErrorBanner />}

            <div className="signin-connects" aria-label="Connects to">
              <span className="label">Connects</span>
              <span className="signin-pill"><span className="swatch swatch--jira" />Jira</span>
              <span className="signin-pill"><span className="swatch swatch--sheet" />Google Sheets</span>
              <span className="signin-pill"><span className="swatch swatch--gmail" />Gmail</span>
            </div>
          </section>

          {showFirstRun && <FirstRunHelper />}
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ state, onClick }) {
  const loading = state === 'loading';
  const label =
    loading              ? 'Signing you in…' :
    state === 'error'    ? 'Try a different account' :
                           'Sign in with Google';
  return (
    <button
      className="gbtn"
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading
        ? <span className="gbtn-spinner" aria-hidden="true" />
        : <span className="g-disc" aria-hidden="true"><span className="g-glyph">G</span></span>}
      <span className="gbtn-label">{label}</span>
      {!loading && <span className="gbtn-shortcut" aria-hidden="true">G</span>}
    </button>
  );
}

function ErrorBanner() {
  return (
    <div className="signin-err" role="alert">
      <span className="ico" aria-hidden="true">!</span>
      <div>
        <strong>That account isn’t eligible.</strong>{' '}
        AutoClock is internal to Iksula — please sign in with your{' '}
        <span className="domain">@iksula.com</span> account.
      </div>
    </div>
  );
}

function FirstRunHelper() {
  return (
    <div className="ac-card" role="note" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ac-n-100)', color: 'var(--ac-text-muted)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ac-font-mono)', fontWeight: 700, fontSize: 13 }}>
        1·2·3
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 'var(--ac-weight-semibold)' }}>First time here?</div>
        <div style={{ fontSize: 12, color: 'var(--ac-text-muted)', marginTop: 2 }}>
          Sign in, connect Jira &amp; Google once, then log your day in one click.
        </div>
      </div>
      <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 14, color: 'var(--ac-text-subtle)' }}>↘</div>
    </div>
  );
}
