// ReminderHistoryPage (P12) — Operations reminder history.
// Shows past Fri/Mon/manual reminder runs in a rail, with the selected run's
// details (recipients + an optional inline email preview) on the right.
//
// Source design: docs/FrontEnd Design /Reminder History.html (prototype
// scaffolding stripped — useTweaks / TWEAK_DEFAULTS / EDITMODE / __bundler).
// Extraction notes: /tmp/allpages-extraction-notes.md (P12 section).
//
// Data:
//   api.ops.reminders({ filter }) → EP-18
//     { runs: [{ id, date, when, type, label, emailed, complied, by, auto,
//                status, summary, recipients:[{id,name,team,email,gap,status}] }] }
//
// URL state:
//   ?runId   = which run is selected (defaults to first)
//   ?filter  = all|friday|monday|manual (default all)
//   ?showEmail = 1 (default off — clicking "Show email" toggles)
//
// Auth: <RequireRole roles={['operations']}>. `admin` is auto-allowed.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import FilterChips from '../components/filters/FilterChips';
import PersonRow from '../components/people/PersonRow';
import StatusPill from '../components/pills/StatusPill';
import RunListRail from '../components/ops/RunListRail';
import RunDetailPane from '../components/ops/RunDetailPane';
import EmailPreviewCard from '../components/ops/EmailPreviewCard';

import '../styles/reminders.css';

const FILTER_VALUES = new Set(['all', 'friday', 'monday', 'manual']);

// Generic templated email body. In production this comes from the run
// payload or a separate template endpoint (OQ-AP-10).
function buildEmailBody(run) {
  if (!run) return '';
  const greet =
    run.type === 'friday' ? 'Friendly Friday nudge' :
    run.type === 'monday' ? 'Monday catch-up nudge' :
    'AutoClock reminder';
  return [
    `Hi team,`,
    ``,
    `${greet}: your timesheet for ${run.label.split('·')[1]?.trim() || 'this week'} `
      + `looks a bit light. AutoClock noticed a gap against the weekly 40h target.`,
    ``,
    `You can close your day in 90 seconds:`,
    `  1. Open AutoClock at https://autoclock.iksula.local/today`,
    `  2. Add the missing slots`,
    `  3. Hit "Close My Day" — it syncs to Jira, the timesheet, and Gmail`,
    ``,
    `This nudge was sent automatically; reply only if something looks wrong.`,
    ``,
    `— AutoClock`,
  ].join('\n');
}

export default function ReminderHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam   = searchParams.get('filter');
  const runIdParam    = searchParams.get('runId');
  const showEmailFlag = searchParams.get('showEmail') === '1';
  const filter = FILTER_VALUES.has(filterParam) ? filterParam : 'all';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // The mock endpoint returns the full list regardless of filter; the
    // page filters client-side. Real EP-18 may support server-side filter.
    api.ops.reminders({})
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Filter client-side; we want counts for the chips regardless of filter.
  const runs = data?.runs || [];

  const counts = useMemo(() => {
    const out = { all: runs.length, friday: 0, monday: 0, manual: 0 };
    for (const r of runs) {
      if (r.type === 'friday') out.friday += 1;
      else if (r.type === 'monday') out.monday += 1;
      else if (r.type === 'manual') out.manual += 1;
    }
    return out;
  }, [runs]);

  const visibleRuns = useMemo(() => {
    if (filter === 'all') return runs;
    return runs.filter(r => r.type === filter);
  }, [runs, filter]);

  // Default selected run = first visible. Driven by URL so deep-linking works.
  const selectedId = useMemo(() => {
    if (runIdParam && visibleRuns.some(r => r.id === runIdParam)) return runIdParam;
    return visibleRuns[0]?.id || null;
  }, [runIdParam, visibleRuns]);

  const selectedRun = useMemo(
    () => runs.find(r => r.id === selectedId) || null,
    [runs, selectedId]
  );

  const onFilterChange = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'all') params.delete('filter'); else params.set('filter', next);
      // Filter change resets the run selection so URL stays clean.
      params.delete('runId');
      return params;
    }, { replace: false });
  };

  const onSelectRun = (id) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('runId', id);
      return params;
    }, { replace: false });
  };

  const onToggleEmail = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (showEmailFlag) params.delete('showEmail');
      else params.set('showEmail', '1');
      return params;
    }, { replace: false });
  };

  const onBackToRail = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('runId');
      return params;
    }, { replace: false });
  };

  // On mobile we treat "has a selected run" as the cue to collapse the rail.
  // CSS handles the actual layout via `.is-mobile-detail` modifier — see
  // reminders.css. Only applies under the 900px breakpoint.
  const mobileDetailMode = !!runIdParam && !!selectedRun;

  const emailFrom = 'autoclock@iksula.com';
  const emailTo = selectedRun
    ? `${selectedRun.emailed} ${selectedRun.emailed === 1 ? 'recipient' : 'recipients'} · BCC`
    : '';
  const emailSubject = selectedRun
    ? `[AutoClock] ${selectedRun.label} — gentle nudge`
    : '';
  const emailWhen = selectedRun ? selectedRun.when : '';

  return (
    <AppShell innerClassName="page-reminders">
      <div className="page-reminders">

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <Link to="/ops/compliance" className="page-head__back">← Compliance</Link>
              <span className="page-head__badge"><b>12</b>— Operations</span>
            </div>
            <h1>Reminder History</h1>
            <p className="page-head__sub">
              Past Friday / Monday / manual reminder runs — see who was emailed and who complied within 24 hours.
            </p>
          </div>
        </header>

        {/* PAGE TABS — only History is wired in M0 */}
        <div className="page-tabs" role="tablist" aria-label="Reminder history sections">
          <button
            type="button"
            role="tab"
            className="page-tabs__tab"
            aria-current="page"
            aria-selected="true"
          >
            History
          </button>
          <button
            type="button"
            role="tab"
            className="page-tabs__tab"
            aria-selected="false"
            aria-disabled="true"
            disabled
            title="Templates editor — coming in M1"
          >
            Templates
          </button>
          <button
            type="button"
            role="tab"
            className="page-tabs__tab"
            aria-selected="false"
            aria-disabled="true"
            disabled
            title="Reminder cadence settings — coming in M1"
          >
            Settings
          </button>
        </div>

        {error && (
          <div className="error" role="alert">
            Couldn&apos;t load reminder history — {error}
          </div>
        )}

        {!error && (
          <div className={`pane-grid${mobileDetailMode ? ' is-mobile-detail' : ''}`}>

            {/* LEFT — filter chips + run list */}
            <aside className="pane-rail" aria-label="Reminder runs">
              <div className="rail-filters">
                <FilterChips
                  ariaLabel="Filter reminder runs by type"
                  chips={[
                    { value: 'all',    label: 'All',    count: counts.all },
                    { value: 'friday', label: 'Friday', count: counts.friday },
                    { value: 'monday', label: 'Monday', count: counts.monday },
                    { value: 'manual', label: 'Manual', count: counts.manual },
                  ]}
                  value={filter}
                  onChange={onFilterChange}
                />
              </div>

              {loading && (
                <div className="loading" role="status">Loading reminder runs…</div>
              )}
              {!loading && (
                <RunListRail
                  runs={visibleRuns}
                  selectedId={selectedId}
                  onSelect={onSelectRun}
                />
              )}
            </aside>

            {/* RIGHT — selected run details */}
            <section className="pane-detail" aria-label="Run details">
              <RunDetailPane
                run={selectedRun}
                onBack={mobileDetailMode ? onBackToRail : undefined}
                trailing={
                  selectedRun && (
                    <EmailPreviewCard
                      open={showEmailFlag}
                      onToggle={onToggleEmail}
                      subject={emailSubject}
                      from={emailFrom}
                      to={emailTo}
                      when={emailWhen}
                      body={buildEmailBody(selectedRun)}
                    />
                  )
                }
              >
                {selectedRun && selectedRun.recipients?.length > 0 ? (
                  <div className="recipients-list">
                    {selectedRun.recipients.map((rec) => {
                      const pill = rec.status === 'bad'
                        ? <StatusPill tone="failed">Under</StatusPill>
                        : <StatusPill tone="ok">Complied</StatusPill>;
                      return (
                        <PersonRow
                          key={rec.id}
                          person={{
                            id: rec.id,
                            name: rec.name,
                            team: rec.team,
                            email: rec.email,
                            hue: rec.hue,
                          }}
                          meta={`${rec.gap}h gap`}
                          statusPill={pill}
                        />
                      );
                    })}
                  </div>
                ) : (
                  selectedRun && (
                    <div className="recipients-empty">
                      No individual recipient breakdown stored for this run.
                    </div>
                  )
                )}
              </RunDetailPane>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
