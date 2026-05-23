// TeamMemberDetailPage (P09) — single team member's 14-day hours, KPIs,
// per-day breakdown, and inline "behind target" advisory.
//
// Source design: docs/FrontEnd Design /Team Member Detail.html (prototype
// scaffolding stripped — useTweaks / TWEAK_DEFAULTS / EDITMODE / __bundler).
// Extraction notes: /tmp/allpages-extraction-notes.md (P09 section).
//
// Data: api.team.member(:id) → OQ-AP-08
//   { member:{id,name,email,role,team,hue,presence},
//     kpis:[{label,value,delta}, …],
//     dailyMins:[{date,wd,day,mins,sync}],
//     days:[{date,wd,total,tickets:[{proj,key,title,mins,slots,sync}]}],
//     deltaVsTeam:int, status:'ontrack'|'behind' }
//
// Auth: <RequireAuth><RequireOnboarded><RequireRole roles={['pm_lead']}>...
// admin auto-allowed via RequireRole.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import BarChart from '../components/charts/BarChart';
import DayRowExpandable from '../components/team/DayRowExpandable';
import AlertBanner from '../components/banners/AlertBanner';
import { fmtDur, initials } from '../lib/format';

import '../styles/team-member.css';

// Target line: 480 min = 8h. Matches the design ("Target" legend swatch).
const DAILY_TARGET_MIN = 480;
const WEEKLY_TARGET_MIN = DAILY_TARGET_MIN * 5;

/** Translate a {label, value, delta} mock row into KpiCard <delta> shape.
 *  `delta` in the mock is a free-text string ('+2.4h', 'on track', 'behind').
 *  We infer direction by the leading sign; unknown strings stay neutral. */
function deriveDelta(raw) {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  let direction = 'flat';
  let tone = 'info';
  if (s.startsWith('+')) { direction = 'up';   tone = 'ok';  }
  else if (s.startsWith('-')) { direction = 'down'; tone = 'bad'; }
  else if (/behind/i.test(s)) { direction = 'down'; tone = 'bad'; }
  else if (/on track|on time/i.test(s)) { direction = 'flat'; tone = 'ok'; }
  else if (/warn|short/i.test(s)) { direction = 'flat'; tone = 'warn'; }
  return { value: s, direction, tone };
}

export default function TeamMemberDetailPage() {
  const { memberId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.team.member(memberId)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [memberId]);

  // Pre-compute chart inputs (stable across renders)
  const chartLabels = useMemo(
    () => (data?.dailyMins || []).map(d => d.wd),
    [data?.dailyMins],
  );
  const chartValues = useMemo(
    () => (data?.dailyMins || []).map(d => d.mins),
    [data?.dailyMins],
  );

  // Roll up — total minutes over the 14-day window
  const totalMins = useMemo(
    () => chartValues.reduce((acc, n) => acc + (n || 0), 0),
    [chartValues],
  );
  // Peak day — used in the chart's aria-label so screen readers get a real summary.
  const peakDay = useMemo(() => {
    if (!data?.dailyMins?.length) return null;
    return data.dailyMins.reduce((best, d) => (d.mins > (best?.mins || -1) ? d : best), null);
  }, [data?.dailyMins]);

  if (loading) {
    return (
      <AppShell innerClassName="page-team-member">
        <div className="page-team-member">
          <div className="loading" role="status">Loading member…</div>
        </div>
      </AppShell>
    );
  }

  if (error || !data?.member) {
    return (
      <AppShell innerClassName="page-team-member">
        <div className="page-team-member">
          <div className="error" role="alert">
            Couldn’t load this team member{error ? ` — ${error}` : ''}.
            {' '}<Link to="/team">Back to Team</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { member, kpis = [], days = [], status, deltaVsTeam } = data;
  const isBehind = status === 'behind';

  // 7-day rolling logged → drives the "behind" banner copy
  const weekLogged = (data?.dailyMins || []).slice(-7).reduce((a, d) => a + d.mins, 0);
  const weekGapMin = Math.max(0, WEEKLY_TARGET_MIN - weekLogged);

  // Build a stable subject + body for the "Share email" mailto link.
  const mailto = (() => {
    const subj = encodeURIComponent(`AutoClock — ${member.name} · 14-day summary`);
    const body = encodeURIComponent(
      `Hi ${member.name?.split(' ')[0] || ''},\n\nQuick AutoClock summary for the last 14 days:\n` +
      `Total logged: ${fmtDur(totalMins)}\nStatus: ${status}\n` +
      `Delta vs team: ${(deltaVsTeam ?? 0) >= 0 ? '+' : ''}${deltaVsTeam ?? 0}\n\n` +
      `View live: ${window.location.href}\n`
    );
    return `mailto:${member.email || ''}?subject=${subj}&body=${body}`;
  })();

  const chartAria = peakDay
    ? `14-day hours bar chart for ${member.name}. Peak on ${peakDay.wd} ${peakDay.date}: ${fmtDur(peakDay.mins)}. Daily target: ${fmtDur(DAILY_TARGET_MIN)}.`
    : `14-day hours bar chart for ${member.name}.`;

  return (
    <AppShell innerClassName="page-team-member">
      <div className="page-team-member">

        {/* Crumb back to /team */}
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/team" className="crumbs__link">‹ Team</Link>
        </nav>

        {/* HEADER — avatar + name + role + presence */}
        <header className="member-meta">
          <div className="avatar" style={{ background: member.hue || '#2563EB' }} aria-hidden="true">
            {initials(member.name)}
            <span className="presence" aria-label={`${member.presence || 'offline'}`} />
          </div>
          <div className="member-meta__body">
            <div className="name-line">
              <h1>{member.name}</h1>
              <span className="role-pill">{(member.role || '').replace('_', ' ')}</span>
            </div>
            <div className="detail-line">
              <a className="email" href={`mailto:${member.email}`}>{member.email}</a>
              <span className="dim">·</span>
              <span>{member.team || '—'}</span>
              <span className="dim">·</span>
              <span>{member.presence || 'offline'}</span>
            </div>
          </div>
          <div className="member-meta__actions">
            <a className="share-btn" href={mailto}>Share email</a>
          </div>
        </header>

        {/* BEHIND-TARGET ADVISORY (only when status === 'behind') */}
        {isBehind && (
          <AlertBanner
            tone="warn"
            title={`${member.name?.split(' ')[0] || 'They’re'} are behind target`}
            body={`${fmtDur(weekGapMin)} short of the weekly ${fmtDur(WEEKLY_TARGET_MIN)} target across the last 7 days.`}
            action={{ label: 'Send nudge', href: mailto }}
          />
        )}

        {/* KPI ROW — 4 metric cards */}
        <div className="metrics">
          {kpis.map((k, i) => (
            <KpiCard
              key={i}
              variant="metric"
              label={k.label}
              value={k.value}
              delta={deriveDelta(k.delta)}
            />
          ))}
        </div>

        {/* 14-DAY BAR CHART */}
        <section className="chart-card" aria-label="14-day hours chart">
          <div className="chart-head">
            <h2 className="title">14-day hours · last 2 weeks</h2>
            <div className="legend" aria-hidden="true">
              <span className="lg"><span className="sw met" />Logged</span>
              <span className="lg"><span className="sw target" />Target (8h)</span>
            </div>
          </div>
          <BarChart
            labels={chartLabels}
            values={chartValues}
            targetLine={DAILY_TARGET_MIN}
            barLabel="Logged"
            targetLabel="Target"
            barColor="#10B981"
            targetColor="rgba(100, 116, 139, 0.55)"
            ariaLabel={chartAria}
            height={260}
          />
        </section>

        {/* PER-DAY BREAKDOWN */}
        <section className="day-breakdown" aria-label="Per-day breakdown">
          <div className="section-head">
            <h2>Recent days</h2>
            <span className="hint">click a day to see tickets</span>
          </div>
          {days.length === 0 ? (
            <div className="empty">No logged days in this window.</div>
          ) : (
            <div className="day-list">
              {/* Most-recent-first ordering — clone before reverse so we don't mutate props. */}
              {[...days].reverse().map((d) => (
                <DayRowExpandable key={d.date} day={d} defaultExpanded={false} />
              ))}
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
