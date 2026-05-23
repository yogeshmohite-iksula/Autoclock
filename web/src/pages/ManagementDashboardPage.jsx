// ManagementDashboardPage (P10) — Org-wide management view of utilisation and
// where the hours land. Read-only summary: 4 KPIs · utilisation donut · 8-week
// trend · per-team cards (each with a sparkline) · top projects table.
//
// Source design: docs/FrontEnd Design /Management Dashboard.html (prototype
// scaffolding stripped — useTweaks / TWEAK_DEFAULTS / EDITMODE / __bundler).
// Extraction notes: /tmp/allpages-extraction-notes.md (P10 section).
//
// Data: `api.dashboard.org({ range })` → EP-15 (mocked, ext OQ-AP-09).
//   { range, kpis:{peopleLoggingToday,orgUtilization,weekHrs,projectsActive},
//     donut:{logged,leave,untracked,holiday},
//     trend8w:[{week,val}],
//     teams:[{id,name,lead,color,people,weekHrs,weekTarget,util,sparkData}],
//     topProjects:[{id,name,key,color,weekHrs,util}] }
//
// Auth: <RequireAuth><RequireOnboarded><RequireRole roles={['management']}>...
//   `admin` is auto-allowed by RequireRole (see web/src/routes.jsx).

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import RangeTabs from '../components/team/RangeTabs';
import Donut from '../components/charts/Donut';
import TrendChart from '../components/charts/TrendChart';
import TeamCard from '../components/management/TeamCard';
import ProjectRow from '../components/management/ProjectRow';

import '../styles/management.css';

const VALID_RANGES = new Set(['week', 'month', 'quarter']);
const RANGE_OPTIONS = [
  { value: 'week',    label: 'Week'    },
  { value: 'month',   label: 'Month'   },
  { value: 'quarter', label: 'Quarter' },
];
const DONUT_COLORS = ['#10B981', '#F59E0B', '#94A3B8', '#8B5CF6'];

export default function ManagementDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get('range');
  const range = VALID_RANGES.has(rangeParam) ? rangeParam : 'week';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.dashboard.org({ range })
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

  const kpis = data?.kpis || { peopleLoggingToday: 0, orgUtilization: 0, weekHrs: 0, projectsActive: 0 };
  const donut = data?.donut || { logged: 0, leave: 0, untracked: 0, holiday: 0 };
  const trend = data?.trend8w || [];
  const teams = data?.teams || [];
  const topProjects = data?.topProjects || [];

  const trendLabels = useMemo(() => trend.map(t => t.week), [trend]);
  const trendValues = useMemo(() => trend.map(t => t.val), [trend]);

  const donutLabels = ['Logged', 'Leave', 'Untracked', 'Holiday'];
  const donutValues = [donut.logged, donut.leave, donut.untracked, donut.holiday];
  const donutTotal  = donutValues.reduce((a, b) => a + (b || 0), 0);
  const donutPctMid = donutTotal ? Math.round((donut.logged / donutTotal) * 100) : 0;

  const utilTone = kpis.orgUtilization >= 85 ? 'ok' : kpis.orgUtilization >= 70 ? 'warn' : 'alert';
  const rangeLabel = range[0].toUpperCase() + range.slice(1);

  return (
    <AppShell innerClassName="page-management">
      <div className="page-management">

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>01</b>— Management view</span>
            </div>
            <h1>Organization Dashboard</h1>
            <p className="page-head__sub">
              Utilisation across the org — where the hours land, who's on track, and which teams need a hand.
            </p>
          </div>
          <div className="filters">
            <RangeTabs
              value={range}
              onChange={onRangeChange}
              options={RANGE_OPTIONS}
              ariaLabel="Date range"
            />
          </div>
        </header>

        {error && (
          <div className="error" role="alert">Couldn’t load organization dashboard — {error}</div>
        )}

        {/* KPI ROW */}
        {!error && (
          <div className="kpis">
            <KpiCard
              label="People logging today"
              value={String(kpis.peopleLoggingToday)}
              sub="of ~60 active"
              tone={kpis.peopleLoggingToday >= 30 ? 'ok' : kpis.peopleLoggingToday >= 15 ? 'warn' : 'alert'}
              ariaLabel={`People logging today: ${kpis.peopleLoggingToday}`}
            />
            <KpiCard
              label="Org utilisation"
              value={`${kpis.orgUtilization}%`}
              sub={`this ${range}`}
              tone={utilTone}
              trend={{ tone: utilTone === 'alert' ? 'bad' : utilTone, text: `${rangeLabel} view` }}
              ariaLabel={`Org utilisation: ${kpis.orgUtilization} percent this ${range}`}
            />
            <KpiCard
              label={`Hours · this ${range}`}
              value={`${kpis.weekHrs}h`}
              sub="logged across teams"
              ariaLabel={`Hours this ${range}: ${kpis.weekHrs}`}
            />
            <KpiCard
              label="Projects active"
              value={String(kpis.projectsActive)}
              sub="with worklogs this period"
              ariaLabel={`Projects active: ${kpis.projectsActive}`}
            />
          </div>
        )}

        {/* CHART GRID — donut + 8-week trend, side-by-side on desktop, stacked on mobile */}
        {!error && (
          <section className="charts" aria-label="Utilisation breakdown and 8-week trend">
            <div className="charts__card">
              <div className="charts__head">
                <h2 className="charts__title">Utilisation split</h2>
                <p className="charts__sub">where the {range}'s hours go</p>
              </div>
              <div className="charts__body charts__body--donut">
                {loading ? (
                  <div className="loading" role="status">Loading chart…</div>
                ) : (
                  <Donut
                    labels={donutLabels}
                    values={donutValues}
                    colors={DONUT_COLORS}
                    centerLabel={`${donutPctMid}%`}
                    centerSub="logged"
                    ariaLabel={`Utilisation split: logged ${donut.logged}, leave ${donut.leave}, untracked ${donut.untracked}, holiday ${donut.holiday}`}
                    height={240}
                  />
                )}
              </div>
            </div>

            <div className="charts__card">
              <div className="charts__head">
                <h2 className="charts__title">8-week trend</h2>
                <p className="charts__sub">total hours logged each week</p>
              </div>
              <div className="charts__body">
                {loading ? (
                  <div className="loading" role="status">Loading chart…</div>
                ) : (
                  <TrendChart
                    labels={trendLabels}
                    values={trendValues}
                    label="Hours logged"
                    lineColor="#2563EB"
                    fillColor="rgba(37,99,235,0.10)"
                    ariaLabel={`8-week hours trend, from ${trendLabels[0] || ''} to ${trendLabels[trendLabels.length - 1] || ''}`}
                    height={240}
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* TEAMS GRID */}
        {!error && (
          <section className="teams" aria-label="Teams overview">
            <div className="teams__head">
              <span className="page-head__badge"><b>02</b>— Teams</span>
              <span className="teams__count">{teams.length} teams</span>
            </div>
            <div className="team-grid">
              {loading && (
                <div className="loading" role="status">Loading teams…</div>
              )}
              {!loading && teams.length === 0 && (
                <div className="empty">No teams to display yet.</div>
              )}
              {!loading && teams.map(t => (
                <TeamCard key={t.id} team={t} />
              ))}
            </div>
          </section>
        )}

        {/* TOP PROJECTS TABLE */}
        {!error && (
          <section className="top-projects" aria-label="Top projects this period">
            <div className="top-projects__head">
              <span className="page-head__badge"><b>03</b>— Top projects</span>
              <span className="top-projects__sub">ranked by hours · this {range}</span>
            </div>
            <div className="top-projects__table-wrap">
              <table className="top-projects__table">
                <caption className="visually-hidden">Top projects ranked by hours logged this {range}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-rank">#</th>
                    <th scope="col" className="th-name">Project</th>
                    <th scope="col" className="th-hrs">Hours</th>
                    <th scope="col" className="th-util">Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={4} className="loading-cell">Loading projects…</td></tr>
                  )}
                  {!loading && topProjects.length === 0 && (
                    <tr><td colSpan={4} className="empty-cell">No projects to display.</td></tr>
                  )}
                  {!loading && topProjects.map((p, i) => (
                    <ProjectRow key={p.id} project={p} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
