// MyHistoryPage (P07) — per-user history. Left rail (list or calendar view,
// toggled by `?view=list|calendar`) + right panel showing the selected day's
// grouped tickets. View + selected-day are URL-driven so back/forward and
// deep-links work.
//
// Source design: docs/FrontEnd Design /My History.html (prototype scaffolding —
// useTweaks / TWEAK_DEFAULTS / EDITMODE / data-comment-anchor / __bundler — stripped).
// Extraction notes: /tmp/allpages-extraction-notes.md (P07 section).
//
// Data: `api.history.list({ from, to })` (EP-08 extended to a date range —
// see OQ-AP-06; mocked at /api/history?from=&to=).
//
// Auth: route is wrapped in <RequireAuth><RequireOnboarded> in routes.jsx.
// No additional role gate — every authed user can see their own history.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import HistoryRailList from '../components/history/HistoryRailList';
import HistoryRailCalendar from '../components/history/HistoryRailCalendar';
import DaySummaryPanel from '../components/history/DaySummaryPanel';

import '../styles/my-history.css';

/** Build the default {from, to} range = today − 14 days … today (ISO YYYY-MM-DD). */
function defaultRange() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromD = new Date(today); fromD.setDate(today.getDate() - 14);
  const from = fromD.toISOString().slice(0, 10);
  return { from, to };
}

/** Pick a sensible default selected day from the loaded set.
 *  Prefers the latest non-empty day; falls back to the latest day. */
function pickDefaultDay(days) {
  if (!days || !days.length) return null;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].hrs > 0) return days[i].key;
  }
  return days[days.length - 1].key;
}

export default function MyHistoryPage() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params (single source of truth)
  const rawView = searchParams.get('view');
  const view = rawView === 'calendar' ? 'calendar' : 'list';
  const dayParam = searchParams.get('day');

  // Load on mount
  useEffect(() => {
    let abort = false;
    const { from, to } = defaultRange();
    setLoading(true);
    setError(null);
    api.history.list({ from, to })
      .then((res) => {
        if (abort) return;
        setDays(Array.isArray(res?.days) ? res.days : []);
        setLoading(false);
      })
      .catch((e) => {
        if (abort) return;
        setError(e?.message || 'Failed to load history.');
        setLoading(false);
      });
    return () => { abort = true; };
  }, []);

  // Selected-day resolution: URL wins, else default to latest non-empty
  const dayKeys = useMemo(() => new Set(days.map((d) => d.key)), [days]);
  const selectedKey = useMemo(() => {
    if (dayParam && dayKeys.has(dayParam)) return dayParam;
    return pickDefaultDay(days);
  }, [dayParam, dayKeys, days]);
  const selectedDay = useMemo(
    () => days.find((d) => d.key === selectedKey) || null,
    [days, selectedKey],
  );

  // Mutate URL params without losing the other param.
  const updateParams = useCallback((patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setView = useCallback((v) => updateParams({ view: v }), [updateParams]);
  const setDay  = useCallback((k) => updateParams({ day: k }),  [updateParams]);

  return (
    <AppShell>
      <div className="page-history">
        <header className="page-head">
          <div className="page-head__left">
            <h1>My History</h1>
            <p className="page-head__sub">
              Your last 14 days — switch to the calendar view to scrub a month at a glance.
            </p>
          </div>
          <div
            className="view-toggle"
            role="tablist"
            aria-label="History view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={'view-toggle__btn' + (view === 'list' ? ' is-active' : '')}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'calendar'}
              className={'view-toggle__btn' + (view === 'calendar' ? ' is-active' : '')}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
        </header>

        {error && (
          <div className="ac-banner--danger" role="alert">{error}</div>
        )}

        {loading ? (
          <div className="history-loading" aria-busy="true">Loading your history…</div>
        ) : days.length === 0 ? (
          <div className="history-empty">
            <h2>Nothing here yet.</h2>
            <p>Start logging on Today and your history will appear here.</p>
          </div>
        ) : (
          <div className="history-grid">
            <aside className="history-rail" aria-label="History rail">
              {view === 'calendar' ? (
                <HistoryRailCalendar
                  days={days}
                  selectedKey={selectedKey}
                  onSelect={setDay}
                />
              ) : (
                <HistoryRailList
                  days={days}
                  selectedKey={selectedKey}
                  onSelect={setDay}
                />
              )}
            </aside>
            <DaySummaryPanel day={selectedDay} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
