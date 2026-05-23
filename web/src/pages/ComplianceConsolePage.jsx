// ComplianceConsolePage (P11) — Operations weekly compliance console.
// Lets Ops see who's behind on the weekly target, pick recipients, and fire
// a reminder run that emails them.
//
// Source design: docs/FrontEnd Design /Compliance Console.html (prototype
// scaffolding stripped — useTweaks / TWEAK_DEFAULTS / EDITMODE / __bundler).
// Extraction notes: /tmp/allpages-extraction-notes.md (P11 section).
//
// Data:
//   api.ops.compliance({ week }) → EP-16
//     { week, windowStart, windowEnd, target,
//       stats:{ peopleUnder, peopleOk, peopleOnLeave, weekHrsAggregate },
//       people:[{ id, name, role, team, email, weekTarget, logged, gap,
//                 leave, status:'ok'|'short'|'bad', hue, initial }] }
//   api.ops.runCheck({ type, recipientIds }) → EP-17
//     { runId, status, emailed, by }
//
// Auth: <RequireRole roles={['operations']}>. `admin` is auto-allowed.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import AlertBanner from '../components/banners/AlertBanner';
import StatusPill from '../components/pills/StatusPill';
import PersonRow from '../components/people/PersonRow';
import FilterChips from '../components/filters/FilterChips';
import BulkActionBar from '../components/filters/BulkActionBar';

import '../styles/compliance.css';

const FILTER_VALUES = new Set(['all', 'under', 'complete']);

// Map server status ('ok' | 'short' | 'bad') to a StatusPill tone + label.
function statusToPill(status) {
  if (status === 'ok')    return { tone: 'ok',      label: 'Complete' };
  if (status === 'short') return { tone: 'warn',    label: 'Short' };
  if (status === 'bad')   return { tone: 'failed',  label: 'Under' };
  return { tone: 'info', label: 'Pending' };
}

// Friendly role label — ERD uses `pm_lead`; show "PM Lead".
function roleLabel(role) {
  if (!role) return null;
  if (role === 'pm_lead')     return 'PM Lead';
  if (role === 'employee')    return 'Employee';
  if (role === 'operations')  return 'Operations';
  if (role === 'management')  return 'Management';
  if (role === 'admin')       return 'Admin';
  return role;
}

export default function ComplianceConsolePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const weekParam = searchParams.get('week');
  const filterParam = searchParams.get('filter');
  const filter = FILTER_VALUES.has(filterParam) ? filterParam : 'all';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Local UI state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch]           = useState('');
  // Run lifecycle: 'idle' → 'confirming' → 'running' → 'sent'
  const [phase, setPhase]             = useState('idle');
  const [runResult, setRunResult]     = useState(null);
  const [runError, setRunError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.ops.compliance(weekParam ? { week: weekParam } : {})
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [weekParam]);

  // Derived people: filter by chip + name search.
  const people = data?.people || [];
  const counts = useMemo(() => {
    const out = { all: people.length, under: 0, complete: 0 };
    for (const p of people) {
      if (p.status === 'bad' || p.status === 'short') out.under += 1;
      if (p.status === 'ok') out.complete += 1;
    }
    return out;
  }, [people]);

  const visiblePeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(p => {
      if (filter === 'under'    && p.status !== 'bad' && p.status !== 'short') return false;
      if (filter === 'complete' && p.status !== 'ok') return false;
      if (q) {
        const blob = `${p.name} ${p.team || ''} ${p.email || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [people, filter, search]);

  // Reset the run lifecycle whenever the user changes filter / selection.
  useEffect(() => { if (phase === 'sent') return; /* keep success banner sticky */ }, [filter]);

  const onFilterChange = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'all') params.delete('filter'); else params.set('filter', next);
      return params;
    }, { replace: false });
  };

  const toggleSelect = (id, next) => {
    setSelectedIds((prev) => {
      const ns = new Set(prev);
      if (next) ns.add(id); else ns.delete(id);
      return ns;
    });
    // Reset banners if the user starts a new selection after a sent run.
    if (phase === 'sent') { setPhase('idle'); setRunResult(null); }
  };

  const selectAllVisibleUnder = () => {
    const ids = visiblePeople.filter(p => p.status === 'bad' || p.status === 'short').map(p => p.id);
    setSelectedIds(new Set(ids));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const onSendClick = () => {
    if (selectedIds.size === 0) return;
    setPhase('confirming');
    setRunError(null);
  };
  const onCancelConfirm = () => { setPhase('idle'); };

  const onConfirmSend = async () => {
    setPhase('running');
    setRunError(null);
    try {
      const res = await api.ops.runCheck({ type: 'manual', recipientIds: Array.from(selectedIds) });
      setRunResult(res);
      setPhase('sent');
      // Drop selection after a successful send so the bar disappears.
      setSelectedIds(new Set());
    } catch (e) {
      setRunError(e.message || 'Failed to send reminders');
      setPhase('confirming'); // let the user retry / cancel
    }
  };

  const selectedCount = selectedIds.size;
  const week = data?.week || weekParam || '—';
  const target = data?.target || 40;
  const stats = data?.stats || { peopleUnder: 0, peopleOk: 0, peopleOnLeave: 0, weekHrsAggregate: 0 };

  return (
    <AppShell innerClassName="page-compliance">
      <div className="page-compliance">

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <Link to="/org" className="page-head__back">← Organization</Link>
              <span className="page-head__badge"><b>11</b>— Compliance</span>
            </div>
            <h1>Weekly compliance · {week}</h1>
            <p className="page-head__sub">
              Who&apos;s behind on the weekly {target}h target — pick recipients and email a reminder run.
            </p>
          </div>
        </header>

        {error && (
          <div className="error" role="alert">
            Couldn&apos;t load compliance data — {error}
          </div>
        )}

        {/* STATS ROW — 4 KpiCard variant="stat" */}
        {!error && (
          <div className="stats-row">
            <KpiCard
              variant="stat"
              label="Weekly target"
              value={`${target}h`}
              sub="per person"
              ariaLabel={`Weekly target ${target} hours per person`}
            />
            <KpiCard
              variant="stat"
              label="Logged this week"
              value={`${stats.weekHrsAggregate}h`}
              sub={`across ${people.length} people`}
              ariaLabel={`Total logged ${stats.weekHrsAggregate} hours across ${people.length} people`}
            />
            <KpiCard
              variant="stat"
              tone={stats.peopleUnder > 0 ? 'alert' : 'ok'}
              label="Under target"
              value={String(stats.peopleUnder)}
              sub="need a nudge"
              ariaLabel={`${stats.peopleUnder} people under target`}
            />
            <KpiCard
              variant="stat"
              label="Leave-adjusted"
              value={String(stats.peopleOnLeave)}
              sub="on leave this week"
              ariaLabel={`${stats.peopleOnLeave} people on leave this week`}
            />
          </div>
        )}

        {/* FILTERS ROW + bulk action bar (mirror on desktop) */}
        {!error && (
          <div className="filters-row">
            <FilterChips
              ariaLabel="Filter people by compliance status"
              chips={[
                { value: 'all',      label: 'All',      count: counts.all },
                { value: 'under',    label: 'Under',    count: counts.under, tone: 'warn' },
                { value: 'complete', label: 'Complete', count: counts.complete, tone: 'ok' },
              ]}
              value={filter}
              onChange={onFilterChange}
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Search by name, team, email…"
            />
            <div className="filters-row__quick">
              <button
                type="button"
                className="link-btn"
                onClick={selectAllVisibleUnder}
                disabled={counts.under === 0}
              >
                Select all under
              </button>
            </div>
          </div>
        )}

        {/* RUN STATE BANNERS */}
        {!error && phase === 'confirming' && (
          <div className="confirm-banner">
            <AlertBanner
              tone="info"
              title={`Send reminders to ${selectedCount} selected?`}
              body={`Friday check · ${week} — will email ${selectedCount} people.`}
              action={{ label: 'Confirm', onClick: onConfirmSend }}
            />
            <div className="confirm-banner__actions">
              <button type="button" className="link-btn" onClick={onCancelConfirm}>Cancel</button>
            </div>
          </div>
        )}

        {!error && phase === 'running' && (
          <AlertBanner tone="info" title="Sending reminders…" body="This usually takes a couple of seconds." />
        )}

        {!error && phase === 'sent' && runResult && (
          <AlertBanner
            tone="success"
            title={`Emailed ${runResult.emailed} ${runResult.emailed === 1 ? 'person' : 'people'} · run ${runResult.runId}`}
            body={`Sent by ${runResult.by || 'you'}. Track progress in `}
            action={{ label: 'Reminder history →', href: '/ops/reminders' }}
          />
        )}

        {runError && (
          <AlertBanner tone="danger" title="Couldn't send reminders" body={runError} />
        )}

        {/* PERSON LIST */}
        {!error && (
          <section className="people-list" aria-label="People">
            {loading && (
              <div className="loading" role="status">Loading people…</div>
            )}
            {!loading && visiblePeople.length === 0 && (
              <div className="empty">
                {filter === 'all'
                  ? 'No people in this view.'
                  : filter === 'under'
                    ? 'Nobody is under target — great week.'
                    : 'No one has completed the target yet for this filter.'}
              </div>
            )}
            {!loading && visiblePeople.map((p) => {
              const pill = statusToPill(p.status);
              const isSelected = selectedIds.has(p.id);
              const decorated = { ...p, role: roleLabel(p.role) };
              return (
                <PersonRow
                  key={p.id}
                  person={decorated}
                  selected={isSelected}
                  onSelectChange={(next) => toggleSelect(p.id, next)}
                  statusPill={<StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
                  action={
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => { toggleSelect(p.id, true); onSendClick(); /* directly enter confirm */ }}
                      aria-label={`Send reminder to ${p.name}`}
                    >
                      Send
                    </button>
                  }
                />
              );
            })}
          </section>
        )}

        {/* BULK ACTION BAR — only when something is selected */}
        {!error && selectedCount > 0 && phase !== 'sent' && (
          <div className="bulk-bar-anchor">
            <BulkActionBar
              count={selectedCount}
              action="Send reminders"
              busy={phase === 'running'}
              onAction={onSendClick}
              secondary={{ label: 'Clear', onClick: clearSelection }}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
