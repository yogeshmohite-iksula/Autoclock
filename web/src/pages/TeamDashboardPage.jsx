// TeamDashboardPage (P08) — PM / Lead view of one team's hours, status and
// who hasn't logged today. URL-driven range filter (?range=today|week|sprint|month).
//
// Source design: docs/FrontEnd Design /Team Dashboard.html (prototype scaffolding
// stripped — useTweaks / TWEAK_DEFAULTS / EDITMODE / data-comment-anchor / __bundler).
// Extraction notes: /tmp/allpages-extraction-notes.md (P08 section).
//
// Data: `api.team.team({ teamId, range })` → EP-14 (extended shape — OQ-AP-07).
//   { team:{id,name,color}, range, kpis:{hoursLogged,onTrack,behind,onLeave,teamSize},
//     members:[{ id, name, role, hue, initial, today, week, target, weekTarget,
//                status:'logging'|'closed'|'partial'|'missing'|'leave', lastClose }] }
//
// Auth: <RequireAuth><RequireOnboarded><RequireRole roles={['pm_lead']}>...
//   `admin` is auto-allowed by RequireRole (see web/src/routes.jsx).

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import TeamSelector from '../components/team/TeamSelector';
import RangeTabs from '../components/team/RangeTabs';
import MemberRow from '../components/team/MemberRow';
import { fmtDur } from '../lib/format';

import '../styles/team-dashboard.css';

const VALID_RANGES = new Set(['today', 'week', 'sprint', 'month']);

export default function TeamDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get('range');
  const range = VALID_RANGES.has(rangeParam) ? rangeParam : 'today';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Re-fetch whenever range changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.team.team({ range })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [range]);

  const onRangeChange = (next) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('range', next);
      return params;
    }, { replace: false });
  };

  // Derived KPIs for layout/tone
  const kpis = data?.kpis || { hoursLogged: 0, onTrack: 0, behind: 0, onLeave: 0, teamSize: 0 };
  const members = data?.members || [];
  const teamSize = kpis.teamSize ?? members.filter(m => m.status !== 'leave').length;
  const dailyTargetMins = teamSize * 480;
  const weeklyTargetMins = teamSize * 2400;
  const targetMins = range === 'today' ? dailyTargetMins : weeklyTargetMins;
  const pctOfTarget = targetMins ? Math.round((kpis.hoursLogged / targetMins) * 100) : 0;
  const hoursTone = pctOfTarget >= 85 ? 'ok' : pctOfTarget >= 50 ? 'warn' : 'alert';
  const notLogged = useMemo(() => members.filter(m => m.status === 'missing'), [members]);

  return (
    <AppShell innerClassName="page-team-dashboard">
      <div className="page-team-dashboard">

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>01</b>— Lead view</span>
            </div>
            <h1>Team Dashboard</h1>
            <p className="page-head__sub">
              How your squad is tracking today and this week. Click any name for a deeper look.
            </p>
          </div>
          <div className="filters">
            <TeamSelector
              teams={data?.team ? [{ id: data.team.id, name: data.team.name, color: data.team.color }] : []}
              value={data?.team?.id}
              onChange={() => { /* single team for M0 — see PRD §5; OQ-AP-01 */ }}
            />
            <RangeTabs value={range} onChange={onRangeChange} />
          </div>
        </header>

        {error && (
          <div className="error" role="alert">Couldn’t load team dashboard — {error}</div>
        )}

        {/* KPI ROW */}
        {!error && (
          <div className="kpis">
            <KpiCard
              label={range === 'today' ? 'Team hours · today' : `Team hours · this ${range}`}
              value={fmtDur(kpis.hoursLogged)}
              sub={`of ${fmtDur(targetMins)}`}
              trend={{ tone: hoursTone === 'alert' ? 'bad' : hoursTone, text: `${pctOfTarget}% of target` }}
              tone={hoursTone}
              foot={(
                <>
                  <span><strong>{kpis.onTrack}</strong> on track · <strong>{kpis.behind}</strong> behind</span>
                  <span>updated 30s ago</span>
                </>
              )}
              ariaLabel={`Team hours: ${fmtDur(kpis.hoursLogged)} of ${fmtDur(targetMins)}`}
            />
            <KpiCard
              label="On track"
              value={String(kpis.onTrack)}
              sub={`of ${teamSize} people`}
              tone={kpis.onTrack >= Math.ceil(teamSize * 0.7) ? 'ok' : 'warn'}
              ariaLabel={`On track: ${kpis.onTrack} of ${teamSize}`}
            />
            <KpiCard
              label="Behind"
              value={String(kpis.behind)}
              sub={`of ${teamSize} people`}
              tone={kpis.behind === 0 ? 'ok' : kpis.behind <= 2 ? 'warn' : 'alert'}
              ariaLabel={`Behind: ${kpis.behind} of ${teamSize}`}
            />
            <KpiCard
              label="On leave"
              value={String(kpis.onLeave)}
              sub="this period"
              ariaLabel={`On leave: ${kpis.onLeave}`}
            />
          </div>
        )}

        {/* NOT LOGGED TODAY CALLOUT */}
        {!error && !loading && range === 'today' && (
          <div className="not-logged" data-empty={notLogged.length === 0 ? 'true' : 'false'} role="region" aria-label="Not logged today">
            <div className="not-logged__ic" aria-hidden="true">
              {notLogged.length === 0 ? '✓' : '!'}
            </div>
            <div className="not-logged__body">
              <div className="not-logged__title">
                {notLogged.length === 0
                  ? 'Everyone has logged today.'
                  : `${notLogged.length} ${notLogged.length === 1 ? 'person hasn’t' : 'people haven’t'} logged today.`}
              </div>
              {notLogged.length > 0 && (
                <div className="not-logged__chips">
                  {notLogged.map(m => (
                    <span className="member-chip" key={m.id}>
                      <span className="member-chip__av" style={{ background: m.hue }} aria-hidden="true">{m.initial}</span>
                      <span className="member-chip__nm">{m.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMBERS LIST */}
        {!error && (
          <section className="members" aria-label="Team members">
            <div className="members__head">
              <div className="members__title">
                <span className="page-head__badge"><b>02</b>— Members</span>
                <span>{teamSize} on team</span>
              </div>
              <div className="members__meta">click a row for detail</div>
            </div>
            {/* Desktop column headers — hidden on mobile */}
            <div className="members__colheader" aria-hidden="true">
              <span></span>
              <span>Member</span>
              <span>Today</span>
              <span>Week</span>
              <span>Progress</span>
              <span>Status</span>
              <span>Last close</span>
            </div>
            <div className="members__list">
              {loading && (
                <div className="loading" role="status">Loading team…</div>
              )}
              {!loading && members.length === 0 && (
                <div className="empty">No members in this team yet.</div>
              )}
              {!loading && members.map(m => (
                <MemberRow key={m.id} member={m} range={range} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
