// OnboardingPage (P02) — Connect Jira + Google before Today.
// Ported from docs/FrontEnd Design/Onboarding.html. Tweak panel,
// data-comment-anchor, scenario state stripped. The five prototype
// scenarios (none / jira-only / connecting / all-connected / reconnect)
// are real connection state read from api.connections.status().

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, USE_MOCKS } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useISTClock } from '../hooks/useISTClock';

import '../styles/onboarding.css';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser, signOut } = useAuth();
  const ist = useISTClock();
  const [conn, setConn] = useState({ jira: 'idle', google: 'idle' });
  const [error, setError] = useState(null);

  // Fetch live connection status on mount + after any change.
  const refresh = useCallback(async () => {
    try { setConn(await api.connections.status()); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const onConnect = useCallback(async (provider) => {
    if (conn[provider] === 'connected' || conn[provider] === 'connecting') return;
    setError(null);

    if (USE_MOCKS) {
      // Demo: simulate OAuth round-trip in-page.
      api.connections._setMockStatus(provider, 'connecting');
      setConn(c => ({ ...c, [provider]: 'connecting' }));
      setTimeout(() => {
        api.connections._setMockStatus(provider, 'connected');
        setConn(c => ({ ...c, [provider]: 'connected' }));
      }, 1600);
    } else {
      // Real backend: hand off to the OAuth start URL (EP-02 / EP-04).
      const url = provider === 'jira' ? api.auth.jiraConnectUrl() : api.auth.googleConnectUrl();
      window.location.assign(url);
    }
  }, [conn]);

  const bothReady = conn.jira === 'connected' && conn.google === 'connected';

  const onFinish = useCallback(() => {
    if (!bothReady) return;
    // Locally mark the user fully onboarded so the route guards advance.
    // Real backend: server-driven on the next /api/auth/me call.
    setUser({ ...user, onboarding_status: 'connected' });
    // In mocks: keep the in-memory SESSION_USER in sync so a refresh on
    // /today doesn't bounce the user back to /onboarding.
    if (USE_MOCKS) api.connections._setMockOnboardingComplete?.();
    navigate('/today', { replace: true });
  }, [bothReady, user, setUser, navigate]);

  const onSignOut = async () => {
    await signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <div className="onboarding-shell">
      {/* Backgrounds — match the prototype default ("photo" aurora). */}
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
            <span>setup · step {bothReady ? 3 : (conn.jira === 'connected' ? 2 : 1)} of 3</span>
            <span style={{ opacity: 0.45 }}>•</span>
            <span>IST&nbsp;{ist.hm}:{ist.s}</span>
          </span>
        </div>
        <div className="chrome-bl">
          <div className="footer-line">
            <strong>You’re almost in.</strong>{' '}
            Both connections are required to start logging.
          </div>
        </div>
        <div className="chrome-br">
          <span className="user-chip">
            <span className="avatar">{initials(user?.name || '')}</span>
            <span>{(user?.name || '').split(' ')[0]}</span>
            <button type="button" className="signout" onClick={onSignOut}>Sign out</button>
          </span>
        </div>
      </div>

      <div className="onboarding-center">
        <div className="onboarding-stack">
          <div className="onboarding-head">
            <div className="eyebrow">
              <span className="dash" /><span>One-time setup</span><span className="dash" />
            </div>
            <h1 className="h1">Connect your accounts</h1>
            <p className="sub">
              AutoClock posts your day to Jira, Google Sheets &amp; Gmail — under your name,
              with your permissions. Connect once, log every day in one click.
            </p>
            <Stepper jira={conn.jira} google={conn.google} />
          </div>

          <div className="onboarding-card">
            {error && <div className="ac-banner ac-banner--danger" role="alert">{error}</div>}

            <div className="conn-rows">
              <ConnectionRow
                kind="jira"
                title="Jira"
                reason="So your worklogs post under your name."
                status={conn.jira}
                account={user?.email ? jiraAccountFor(user.email) : ''}
                onConnect={() => onConnect('jira')}
              />
              <ConnectionRow
                kind="google"
                title="Google Workspace"
                reason="So AutoClock can update your timesheet and draft your end-of-day email."
                status={conn.google}
                account={user?.email || ''}
                onConnect={() => onConnect('google')}
              />
            </div>

            <div className="reassure">
              <span className="shield" aria-hidden="true">🔒︎</span>
              <span>
                AutoClock <strong style={{ color: 'var(--ac-text)' }}>never tracks your activity in the background</strong> —
                it only stores what you type. Tokens stay on Iksula’s servers.
              </span>
            </div>

            <div className="onboarding-card-footer">
              <div className={'meta ' + (bothReady ? '' : 'not-ready')}>
                <span className="dotty" />
                <span>
                  {bothReady
                    ? 'All set — ready to log your first day.'
                    : `Waiting on ${conn.jira !== 'connected' ? 'Jira' : 'Google'}…`}
                </span>
              </div>
              <button
                className="onboarding-btn onboarding-btn--primary onboarding-finish"
                disabled={!bothReady}
                onClick={onFinish}
              >
                <span>Finish setup</span>
                <span className="arrow">→</span>
              </button>
            </div>
          </div>

          <div className="onboarding-skip">
            Trouble connecting? <a href="mailto:it@iksula.com">Ask IT for help</a> · or
            {' '}<a href="/sign-in" onClick={(e) => { e.preventDefault(); onSignOut(); }}>do this later</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

// --- internal components ------------------------------------------------------

function Stepper({ jira, google }) {
  const s1Done       = jira === 'connected';
  const s2Done       = google === 'connected';
  const s2Active     = s1Done && !s2Done && google !== 'connecting';
  const s2Connecting = google === 'connecting';
  const s3Active     = s1Done && s2Done;

  const fill1 = s1Done ? 100 : 0;
  const fill2 = s2Done ? 100 : (s2Connecting ? 50 : 0);

  return (
    <div className="stepper" aria-label="Setup progress">
      <div className={'step ' + (s1Done ? 'done' : 'active')}>
        <div className="bubble">{s1Done ? '✓' : '1'}</div>
        <div className="lbl">Jira</div>
      </div>
      <div className="step-bar"><div className="fill" style={{ width: fill1 + '%' }} /></div>
      <div className={'step ' + (s2Done ? 'done' : (s2Active || s2Connecting ? 'active' : ''))}>
        <div className="bubble">{s2Done ? '✓' : '2'}</div>
        <div className="lbl">Google</div>
      </div>
      <div className="step-bar"><div className="fill" style={{ width: fill2 + '%' }} /></div>
      <div className={'step ' + (s3Active ? 'active' : '')}>
        <div className="bubble">{s3Active ? '✓' : '3'}</div>
        <div className="lbl">Done</div>
      </div>
    </div>
  );
}

function ConnectionRow({ kind, title, reason, status, account, onConnect }) {
  const rowCls =
    status === 'connected' ? 'conn-row connected' :
    status === 'expired'   ? 'conn-row expired'   :
                              'conn-row';
  const pip =
    status === 'connected' ? '✓' :
    status === 'expired'   ? '!' :
                              '·';

  return (
    <div className={rowCls}>
      <div className={'ico ico--' + kind} aria-hidden="true">
        {kind === 'jira' ? 'J' : 'G'}
        <span className="pip">{pip}</span>
      </div>
      <div className="body">
        <div className="title-line">
          <div className="title">{title}</div>
          {status === 'connected' && <span className="tag ok">Connected</span>}
          {status === 'expired'   && <span className="tag warn">Reconnect</span>}
          {(status === 'idle' || status === 'connecting') && <span className="tag req">Required</span>}
        </div>
        <div className="reason">{reason}</div>
        {status === 'connected' && account && (
          <div className="conn-info">
            <span className="check">✓</span>
            <span>Connected as</span>
            <span className="email">{account}</span>
          </div>
        )}
        {status === 'expired' && account && (
          <div className="conn-info">
            <span className="warn-dot">!</span>
            <span>Token expired for</span>
            <span className="email">{account}</span>
          </div>
        )}
      </div>
      <div className="btn-cell">
        {status === 'connecting' ? (
          <button className="onboarding-btn onboarding-btn--primary" disabled>
            <span className="spin" /><span>Connecting…</span>
          </button>
        ) : status === 'connected' ? (
          <button className="onboarding-btn onboarding-btn--ghost" onClick={onConnect}>Manage</button>
        ) : status === 'expired' ? (
          <button className="onboarding-btn onboarding-btn--warn" onClick={onConnect}>Reconnect</button>
        ) : (
          <button className="onboarding-btn onboarding-btn--primary" onClick={onConnect}>
            Connect {kind === 'jira' ? 'Jira' : 'Google'}
          </button>
        )}
      </div>
    </div>
  );
}

// --- helpers ------------------------------------------------------------------

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}
function jiraAccountFor(email) {
  // Best-effort label until Keval's backend returns the real Atlassian account.
  const local = email.split('@')[0];
  return `${local}@iksula.atlassian.net`;
}
