// SyncResultPage (P05) — per-system Close-My-Day outcome.
// Renders the EP-13 response handed over from P04 via location.state.result.
// EP-13 is idempotent (ADR-09, TB-13 external_writes ledger) so any Retry just
// calls /api/day/close again — the server skips already-synced systems and only
// re-attempts the failed ones.
//
// Source design: docs/FrontEnd Design /Sync Result.html — prototype scaffolding
// (useTweaks, TWEAK_DEFAULTS, SCENARIOS, data-comment-anchor) stripped. The
// 4 SCENARIOS map onto real EP-13 shapes:
//   all-success → { jira:{ok>0,failed:0}, sheet:{ok:true}, gmail:{ok:true} }
//   partial     → at least one system failed
//   retrying    → local-only spin on a system we just clicked Retry on
//   all-failed  → every system failed
//
// If the page is hit cold (no router state — someone deep-linked /close/result),
// we render an empty "no recent sync" state with a CTA back to /close. The
// per-page test gate lands on that state; the bespoke test below exercises the
// full Close → Sync flow.

import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import AppShell from '../components/shell/AppShell';
import Icon from '../components/Icon';
import ResultRow from '../components/sync/ResultRow';
import NextActionCard from '../components/sync/NextActionCard';
import { fmtDur, todayIso } from '../lib/format';

import '../styles/sync-result.css';

// EP-13 response shape:
//   { jira:{ok:int, failed:int, worklog_ids:[…]}, sheet:{ok:bool, rows_appended:int},
//     gmail:{ok:bool, draft_id:string}, overall:'ok'|'partial'|'failed' }

/** Convert the per-system EP-13 sub-result → 'success' | 'failure'. */
function systemStatus(raw) {
  if (!raw) return 'failure';
  // jira: failed > 0 is failure, ok > 0 with failed === 0 is success
  if ('failed' in raw) return raw.failed > 0 ? 'failure' : (raw.ok > 0 ? 'success' : 'skipped');
  // sheet / gmail: ok flag
  return raw.ok ? 'success' : 'failure';
}

/** IST-aware short clock for the meta-line. */
function istNow() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
}

/** Empty state when the page is hit without a result in router state. */
function NoRecentSync() {
  return (
    <div className="page-sync-result">
      <div className="empty" role="status">
        <h1>No recent sync to show.</h1>
        <p>
          This page recaps what AutoClock wrote to Jira, Sheets and Gmail after
          you close your day. Head back to Close My Day to run it.
        </p>
        <div className="empty-actions">
          <Link to="/close" className="btn btn--primary">
            <span>Go to Close My Day</span>
            <Icon name="chevron-right" />
          </Link>
          <Link to="/today" className="btn btn--ghost">
            <Icon name="arrow-left" /><span>Back to Today</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SyncResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // The EP-13 response passed by P04 (CloseMyDayPage). If missing, render
  // the empty state — the per-page gate test lands here.
  const initialResult = location.state?.result || null;
  const totalMins = location.state?.totalMins ?? 0;
  const totalSlots = location.state?.groups?.reduce((a, g) => a + (g.slot_count || 1), 0) ?? 0;
  const workDate = location.state?.workDate || todayIso();

  // Local result state — Retry replaces it with the new EP-13 response.
  const [result, setResult] = useState(initialResult);
  // Track which system is mid-retry (local-only spin — the server has no
  // "retrying" state in M0; this drives the StatusPill tone).
  const [retryingSystem, setRetryingSystem] = useState(null);
  const [retryError, setRetryError] = useState(null);

  // Closed-at clock (snapshot at render — fine for the static meta line).
  // Declared above the early-return so hooks run unconditionally (rules of hooks).
  const closedAt = useMemo(() => istNow(), []);

  // Retry a single system → idempotent re-POST of EP-13. The server skips
  // already-synced systems via the external_writes ledger; we only need to
  // replace the local result with the new response.
  const onRetry = useCallback(async (sys) => {
    setRetryingSystem(sys);
    setRetryError(null);
    try {
      const fresh = await api.day.close(workDate);
      setResult(fresh);
      // Replace history state so a back/forward gets the updated result.
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, result: fresh },
      });
    } catch (e) {
      setRetryError(e?.message || 'Retry failed — please try again.');
    } finally {
      setRetryingSystem(null);
    }
  }, [workDate, navigate, location.pathname, location.state]);

  // No result → empty state. (Hooks above run unconditionally.)
  if (!initialResult) {
    return <AppShell><NoRecentSync /></AppShell>;
  }

  // Per-system raw + derived status. retryingSystem overrides server status.
  const jiraStatus  = retryingSystem === 'jira'   ? 'retrying' : systemStatus(result?.jira);
  const sheetStatus = retryingSystem === 'sheets' ? 'retrying' : systemStatus(result?.sheet);
  const gmailStatus = retryingSystem === 'gmail'  ? 'retrying' : systemStatus(result?.gmail);

  const statuses = [jiraStatus, sheetStatus, gmailStatus];
  const successCount = statuses.filter(s => s === 'success').length;
  const failCount    = statuses.filter(s => s === 'failure').length;
  const anyFail   = failCount > 0;
  const anyRetry  = statuses.some(s => s === 'retrying');
  const allOk     = successCount === 3;
  const allFailed = failCount === 3;

  // Tone for the hero — green / amber / amber+spin / red.
  const tone = allOk ? 'success' : anyRetry ? 'partial' : allFailed ? 'failure' : 'partial';

  // Hero title — colour is one of three accent classes, paired with text so
  // colour isn't the sole signal (a11y).
  const heroTitle = allOk
    ? <>Your day is <span className="accent-green">synced.</span></>
    : anyRetry && !anyFail
      ? <>Retrying… <span className="accent-amber">stand by.</span></>
      : allFailed
        ? <>Sync paused — <span className="accent-red">let&apos;s retry.</span></>
        : <>Mostly synced — <span className="accent-amber">one thing needs a retry.</span></>;
  const heroSub = allOk
    ? 'All three writes landed. Your end-of-day draft is sitting in Gmail, ready to send when you are.'
    : anyRetry && !anyFail
      ? 'Reaching the failed destination again with a fresh token. Usually clears in a few seconds.'
      : allFailed
        ? 'Nothing posted yet — your slots are saved locally, no data lost. Retry all three together.'
        : 'Some destinations need another try. Your slots are saved locally — nothing is lost.';

  // Hero icon (used for both colour AND glyph — a11y).
  const heroGlyph = tone === 'success'
    ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 13l4.5 4.5L19 8" />
      </svg>
    ) : tone === 'failure'
      ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L1.5 21h21L12 2zm0 6.5l7.4 12.5H4.6L12 8.5zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z" />
        </svg>
      );

  // Retry-all — same as per-system but for every failed row. Plain async
  // (not memoised) — it only runs on click and depends on derived state
  // that lives below the early-return, so a useCallback would violate the
  // rules of hooks.
  const onRetryAll = async () => {
    if (!anyFail) return;
    // Mark the first failing one as retrying for visual feedback.
    const firstFail = jiraStatus === 'failure' ? 'jira' : sheetStatus === 'failure' ? 'sheets' : 'gmail';
    setRetryingSystem(firstFail);
    setRetryError(null);
    try {
      const fresh = await api.day.close(workDate);
      setResult(fresh);
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, result: fresh },
      });
    } catch (e) {
      setRetryError(e?.message || 'Retry failed — please try again.');
    } finally {
      setRetryingSystem(null);
    }
  };

  // Per-row body content — narrates the EP-13 sub-result in plain English.
  const jiraDetail = jiraStatus === 'success'
    ? (
      <>
        <span className="num">
          {result.jira?.ok ?? 0} {(result.jira?.ok ?? 0) === 1 ? 'worklog' : 'worklogs'}
        </span> posted to your tickets
        {totalMins > 0 && <> · <span className="num">{fmtDur(totalMins)}</span> total</>}
      </>
    )
    : jiraStatus === 'failure'
      ? (
        <>
          Couldn&apos;t reach Jira — retry.
          <span className="err"><span className="code">{result.jira?.code || '5xx'}</span> {result.jira?.message || 'Network or token issue · check Settings'}</span>
        </>
      )
      : jiraStatus === 'retrying'
        ? (
          <>
            Re-posting worklogs…
            <div className="progress" aria-hidden="true" />
          </>
        )
        : '—';

  const sheetDetail = sheetStatus === 'success'
    ? (
      <>
        Row{' '}
        {result.sheet?.rows_appended != null && <span className="num">{result.sheet.rows_appended}</span>}
        {' '}added to <span className="num">AutoClock — {(user?.name || 'you').split(' ')[0]} — timesheet</span>
      </>
    )
    : sheetStatus === 'failure'
      ? (
        <>
          Couldn&apos;t append to your timesheet — retry.
          <span className="err"><span className="code">{result.sheet?.code || '5xx'}</span> {result.sheet?.message || 'Network or permission issue · reconnect Google'}</span>
        </>
      )
      : sheetStatus === 'retrying'
        ? (
          <>
            Appending timesheet row…
            <div className="progress" aria-hidden="true" />
          </>
        )
        : '—';

  const gmailDetail = gmailStatus === 'success'
    ? (
      <>
        Draft saved · &quot;EOD — {fmtDur(totalMins) || '0m'}&quot;
        {result.gmail?.draft_id && <> · <span className="num">id {result.gmail.draft_id}</span></>}
      </>
    )
    : gmailStatus === 'failure'
      ? (
        <>
          Couldn&apos;t reach Gmail — retry.
          <span className="err"><span className="code">{result.gmail?.code || '5xx'}</span> {result.gmail?.message || 'Service Unavailable · usually a few seconds'}</span>
        </>
      )
      : gmailStatus === 'retrying'
        ? (
          <>
            Re-drafting end-of-day email…
            <div className="progress" aria-hidden="true" />
          </>
        )
        : '—';

  // Per-row actions — link on success, retry on failure, cancel/none on retry.
  const linkBtn = (label) => (
    <a href="#" className="open-link" onClick={(e) => e.preventDefault()}>
      {label} <span className="ext" aria-hidden="true">↗</span>
    </a>
  );
  const retryBtn = (sys) => (
    <button type="button" className="btn btn--retry" onClick={() => onRetry(sys)} aria-label={`Retry ${sys}`}>
      <Icon name="history" /><span>Retry</span>
    </button>
  );

  const jiraActions  = jiraStatus === 'success' ? linkBtn('Open in Jira') : jiraStatus === 'failure' ? retryBtn('jira') : null;
  const sheetActions = sheetStatus === 'success' ? linkBtn('Open timesheet') : sheetStatus === 'failure' ? retryBtn('sheets') : null;
  const gmailActions = gmailStatus === 'success' ? linkBtn('View Gmail draft') : gmailStatus === 'failure' ? retryBtn('gmail') : null;

  return (
    <AppShell>
      <div className="page-sync-result" data-state={tone === 'success' ? 'all-success' : tone === 'failure' ? 'all-failed' : (anyRetry ? 'retrying' : 'partial')}>

        {retryError && <div className="ac-banner--danger" role="alert">{retryError}</div>}

        {/* HERO */}
        <header className="hero">
          <div className="hero-mark" data-tone={tone}>
            <div className="glyph">{heroGlyph}</div>
          </div>
          <div className="body">
            <div className="eyebrow">
              <span className="sec-badge"><b>01</b> — Result</span>
            </div>
            <h1>{heroTitle}</h1>
            <p className="sub">{heroSub}</p>
          </div>
          <div className="count">
            <div className="big">{successCount}<span className="of">/</span>3</div>
            <div className="lbl">
              {successCount === 3 ? 'all destinations synced' : 'destinations synced'}
            </div>
          </div>
        </header>

        {/* RESULTS CARD */}
        <section className="results-card" aria-label="Per-system sync result">
          <div className="results-head">
            <div className="title">
              <span className="sec-badge"><b>02</b> — Detail</span>
              <span>Per-system result</span>
            </div>
            <div className="meta">
              <span>Closed at {closedAt} IST</span>
              <span className="dim">·</span>
              <Link to="/today">View today</Link>
            </div>
          </div>

          <div className="results-list">
            <ResultRow
              system="jira"
              status={jiraStatus}
              title="Jira worklogs"
              detail={jiraDetail}
              actions={jiraActions}
            />
            <ResultRow
              system="sheets"
              status={sheetStatus}
              title="Google Sheet"
              detail={sheetDetail}
              actions={sheetActions}
            />
            <ResultRow
              system="gmail"
              status={gmailStatus}
              title="Gmail draft"
              detail={gmailDetail}
              actions={gmailActions}
            />
          </div>

          {(anyFail || anyRetry) && (
            <div className="results-foot">
              <div className="auto">
                <span className="dot" aria-hidden="true" />
                <span>{anyRetry ? 'Retrying…' : 'Auto-retry paused — manual retry only'}</span>
              </div>
              <div>Your slots are saved locally — nothing is lost.</div>
            </div>
          )}
        </section>

        {/* WHAT NEXT */}
        {!allOk && <NextActionCard anyFail={anyFail} anyRetry={anyRetry} />}

        {/* ACTION BAR */}
        <div className="action-bar">
          <div className="action-bar-inner">
            <div className="reassure">
              <div className="top">
                {allOk
                  ? 'All set. Your day is closed and posted.'
                  : `${successCount} of 3 destinations synced. ${anyFail ? 'Retry the rest, or close and we’ll keep trying.' : ''}`}
              </div>
              <div className="sub">
                {allOk
                  ? `Posted at ${closedAt} IST${totalMins ? ` · ${fmtDur(totalMins)}` : ''}${totalSlots ? ` · ${totalSlots} ${totalSlots === 1 ? 'worklog' : 'worklogs'}` : ''}`
                  : 'Your slots are safe — saved locally, queued for re-sync'}
              </div>
            </div>
            <div className="actions">
              {anyFail && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={onRetryAll}
                  disabled={!!retryingSystem}
                  aria-label="Retry all failed destinations"
                >
                  <Icon name="history" /><span>Retry all</span>
                </button>
              )}
              <Link className="btn btn--primary" to="/today" aria-label="Done — back to Today">
                <span>Done</span>
                <Icon name="chevron-right" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
