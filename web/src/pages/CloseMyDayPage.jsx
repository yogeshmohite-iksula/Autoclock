// CloseMyDayPage (P04) — preview + idempotent close.
// Wires to EP-12 (POST /api/day/preview) and EP-13 (POST /api/day/close).
// "Confirm" is server-side idempotent via the external_writes ledger (TB-13,
// ADR-09). FR-04: always two-step (preview → confirm) — we never call EP-13
// without first showing the user the grouped preview.
//
// Source design: docs/FrontEnd Design /Close My Day.html (prototype scaffolding
// — useTweaks/TWEAK_DEFAULTS/EDITMODE/data-comment-anchor — stripped).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import AppShell from '../components/shell/AppShell';
import Icon from '../components/Icon';
import TicketGroupCard from '../components/today/TicketGroupCard';
import DestinationRow from '../components/close/DestinationRow';
import WarningPill from '../components/pills/WarningPill';
import JiraGlyph from '../components/glyphs/JiraGlyph';
import SheetsGlyph from '../components/glyphs/SheetsGlyph';
import GmailGlyph from '../components/glyphs/GmailGlyph';
import { fmtDur, todayIso } from '../lib/format';

import '../styles/close-my-day.css';

const DAILY_TARGET_MINUTES = 480; // 8h
const MAX_DAY_MINUTES = 24 * 60;

export default function CloseMyDayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = todayIso();

  const [preview, setPreview] = useState(null);     // EP-12 response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);

  // Load preview on mount
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.day.preview(today)
      .then(d => { if (alive) { setPreview(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || 'Preview failed'); setLoading(false); } });
    return () => { alive = false; };
  }, [today]);

  const groups = preview?.groups || [];
  const totalMins = preview?.total_minutes ?? groups.reduce((a, g) => a + (g.minutes || 0), 0);
  const totalSlots = groups.reduce((a, g) => a + (g.slot_count || 1), 0);
  const warnings = preview?.warnings || [];

  // Derived flags — soft (amber) vs blocking (red) warnings
  const blockedOver24 = totalMins > MAX_DAY_MINUTES;
  const overlapWarn = warnings.find(w => /overlap/i.test(w?.type || ''));
  const softWarn = warnings.find(w => !/overlap|over_24/i.test(w?.type || ''));
  const blocked = blockedOver24 || !!warnings.find(w => /over_24/i.test(w?.type || ''));
  const canConfirm = !loading && !posting && groups.length > 0 && !blocked;

  // Date label — IST-aware (matches TodayPage behaviour)
  const dateLong = useMemo(() => new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric',
  }), []);

  const onConfirm = useCallback(async () => {
    if (!canConfirm) return;
    setError(null);
    setPosting(true);
    try {
      // EP-13 — idempotent server-side; safe to retry.
      const result = await api.day.close(today);
      // Hand result to /close/result via router state (no refetch needed).
      navigate('/close/result', { state: { result, totalMins, groups } });
    } catch (e) {
      setError(e.message || 'Close failed');
      setPosting(false);
    }
  }, [canConfirm, today, navigate, totalMins, groups]);

  return (
    <AppShell>
      <div className="page-close-my-day">

        {error && <div className="ac-banner--danger" role="alert">{error}</div>}

        {/* HERO */}
        <div className="hero">
          <div>
            <div className="eyebrow">
              <span className="sec-badge"><b>01</b> — Close out</span>
            </div>
            <h1>
              Close your day —{' '}
              <span className="accent">here&apos;s what AutoClock will do.</span>
            </h1>
            <p className="sub">
              Three writes, no surprises. Review the tidied descriptions, check the destinations,
              then click confirm. Nothing leaves this screen until you say so.
            </p>
          </div>
          <div className="right">
            <div className="day-total" data-met={totalMins >= DAILY_TARGET_MINUTES ? 'true' : 'false'}>
              <span className="num">{fmtDur(totalMins)}</span>
              <span className="lbl">
                {totalMins >= DAILY_TARGET_MINUTES
                  ? 'today · ✓ 8h goal met'
                  : `today · ${fmtDur(Math.max(0, DAILY_TARGET_MINUTES - totalMins))} to 8h`}
              </span>
            </div>
            <div className="day-total-meta">
              {groups.length} {groups.length === 1 ? 'ticket' : 'tickets'} · {totalSlots} {totalSlots === 1 ? 'slot' : 'slots'}
            </div>
          </div>
        </div>

        {/* SECTION 1 — DAY SUMMARY */}
        {loading ? (
          <section className="sec" aria-busy="true">
            <div className="sec-head">
              <div className="title-block">
                <span className="sec-badge"><b>02</b> — Summary</span>
                <div className="title">Loading your day…</div>
                <div className="lead">Fetching the grouped preview from EP-12.</div>
              </div>
            </div>
          </section>
        ) : groups.length === 0 ? (
          <section className="sec">
            <div className="empty">
              <h2>Nothing logged yet today.</h2>
              <p>Add at least one work slot on Today before closing your day.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate('/today')}
              >
                <Icon name="arrow-left" /><span>Back to Today</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="sec">
            <div className="sec-head">
              <div className="title-block">
                <span className="sec-badge"><b>02</b> — Summary</span>
                <div className="title">Your day, grouped by Jira ticket</div>
                <div className="lead">
                  {groups.length} {groups.length === 1 ? 'ticket' : 'tickets'} ·
                  descriptions tidied and merged from {totalSlots} {totalSlots === 1 ? 'slot' : 'slots'}.
                </div>
              </div>
              <div className="right">
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ height: 36, padding: '0 12px', fontSize: 12.5 }}
                  onClick={() => navigate('/today')}
                >
                  <Icon name="arrow-left" /><span>Edit a slot</span>
                </button>
              </div>
            </div>
            <div className="groups">
              {groups.map(g => (
                <TicketGroupCard key={g.jira_key} group={g} />
              ))}
            </div>
            <div className="total-strip" aria-hidden="true">
              <div />
              <div className="label">
                Total
                <span className="breakdown">
                  · {groups.length} tickets · {totalSlots} slots
                </span>
              </div>
              <div className={'total' + (blockedOver24 ? ' alert' : '')}>
                {fmtDur(totalMins)}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2 — DESTINATIONS */}
        {groups.length > 0 && (
          <section className="sec">
            <div className="sec-head">
              <div className="title-block">
                <span className="sec-badge"><b>03</b> — Destinations</span>
                <div className="title">Where this goes</div>
                <div className="lead">All three writes happen at once. If any fails, nothing posts.</div>
              </div>
            </div>
            <div className="dests">
              <DestinationRow
                icon={<JiraGlyph size={22} />}
                title="Jira worklogs"
                actionLine={
                  <>
                    <span className="num">{totalSlots}</span>{' '}
                    {totalSlots === 1 ? 'worklog' : 'worklogs'} will be posted to your tickets.
                  </>
                }
                detail={
                  <>
                    Posted by <span className="key">@{(user?.email || 'you').split('@')[0]}</span> · author preserved
                  </>
                }
              >
                <div className="mini-list">
                  {groups.map(g => (
                    <div className="row" key={g.jira_key}>
                      <span className="key">{g.jira_key}</span>
                      <span className="dur">+ {fmtDur(g.minutes)}</span>
                    </div>
                  ))}
                </div>
              </DestinationRow>

              <DestinationRow
                icon={<SheetsGlyph size={22} />}
                title="Google Sheet"
                actionLine={
                  <>
                    <span className="num">1</span> row will be added to your timesheet.
                  </>
                }
                detail={
                  <>
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      AutoClock — {(user?.name || 'you').split(' ')[0]} — timesheet
                    </a>
                    <br />
                    Row appended · columns: date, hrs, tickets, summary
                  </>
                }
              />

              <DestinationRow
                icon={<GmailGlyph size={22} />}
                title="Gmail draft"
                actionLine={
                  <>An <strong>end-of-day email draft</strong> will be created.</>
                }
                detail={
                  <>
                    Subject: &quot;EOD — {dateLong} · {fmtDur(totalMins)}&quot;<br />
                    Saved as a draft — you send it.
                  </>
                }
              />
            </div>
          </section>
        )}

        {/* SECTION 3 — REVIEW / WARNINGS */}
        {(overlapWarn || softWarn || blocked) && (
          <section className="sec">
            <div className="sec-head">
              <div className="title-block">
                <span className="sec-badge"><b>04</b> — Review</span>
                <div className="title">
                  {blocked ? "This day can't be closed yet" : 'A couple things to check'}
                </div>
                <div className="lead">
                  {blocked
                    ? 'Fix the issues below to enable confirm.'
                    : 'Soft warnings — you can proceed, but worth a glance.'}
                </div>
              </div>
            </div>
            <div className="warns">
              {overlapWarn && (
                <WarningPill
                  tone="amber"
                  title="Two slots overlap — please review."
                  sub={overlapWarn.msg || 'Some of today\'s slots share a time window.'}
                  action={
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                      onClick={() => navigate('/today')}
                    >
                      Open in editor
                    </button>
                  }
                />
              )}
              {softWarn && !overlapWarn && (
                <WarningPill
                  tone="amber"
                  title={softWarn.title || 'Something to check'}
                  sub={softWarn.msg || ''}
                />
              )}
              {blocked && (
                <WarningPill
                  tone="red"
                  title="Day total exceeds 24 hours."
                  sub={
                    <>
                      You&apos;ve logged <strong>{fmtDur(totalMins)}</strong> for one calendar day —
                      that&apos;s longer than 24 hours. Most likely a typo in one of the durations.
                      Jira will reject the post if we send it.
                    </>
                  }
                  action={
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                      onClick={() => navigate('/today')}
                    >
                      Open in editor
                    </button>
                  }
                />
              )}
            </div>
          </section>
        )}

        {/* ACTION BAR */}
        <div className="action-bar">
          <div className="action-bar-inner">
            <div className="reassure">
              <div className="top">
                {groups.length > 0 ? (
                  <>
                    Ready to post <span className="num">{fmtDur(totalMins)}</span> to {totalSlots} Jira {totalSlots === 1 ? 'worklog' : 'worklogs'}, 1 Sheet row, and 1 Gmail draft.
                  </>
                ) : (
                  <>Nothing to close yet — log some slots on Today first.</>
                )}
              </div>
              <div className="sub">
                <span className="dot" />
                <span>All-or-nothing · if any write fails, nothing posts</span>
              </div>
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate('/today')}
              >
                <Icon name="arrow-left" /><span>Back to edit</span>
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={onConfirm}
                disabled={!canConfirm}
                aria-label="Close My Day — confirm and sync"
              >
                {posting ? (
                  <>
                    <span className="spin" /><span>Posting…</span>
                  </>
                ) : (
                  <>
                    <span>Close My Day</span><span className="kbd">⌘↵</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
