// ProjectMappingPage (P15) — admin Project ↔ Jira mapping console.
//
// Source design: docs/FrontEnd Design /Project Mapping.html
// Extraction notes: /tmp/allpages-extraction-notes.md (P15 section).
//
// Route: /admin/projects  (RequireAuth + RequireOnboarded + RequireRole admin).
// ERD:   EP-20 GET/POST /api/admin/projects  +  POST /api/admin/projects/test
//        (mocked — see web/src/api/mocks.js and web/src/api/admin.js).
//
// URL state:
//   ?filter=all|client|internal|attention   (default 'all')
//   ?q=…                                    (search)
//
// Composition:
//   AppShell
//   ├── AdminTabs (active=projects)
//   ├── page-head ("Project ↔ Jira Mapping" + "Add mapping" CTA)
//   ├── 4 KpiCards (Total mappings / Healthy / Failing / Unmapped)
//   ├── FilterChips (filter + search)
//   └── list of ProjectMappingRow
//
// Modal: MappingFormModal handles both Add and Edit. The mock currently has
// no PUT for projects (only POST) — Edit falls back to an optimistic local
// update and is logged in docs/frontend-allpages-issues.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import FilterChips from '../components/filters/FilterChips';
import AdminTabs from '../components/admin/AdminTabs';
import ProjectMappingRow from '../components/admin/ProjectMappingRow';
import MappingFormModal from '../components/admin/MappingFormModal';

import '../styles/project-mapping.css';

const FILTER_VALUES = new Set(['all', 'client', 'internal', 'attention']);

const FILTER_CHIP_DEFS = [
  { value: 'all',        label: 'All' },
  { value: 'client',     label: 'Client' },
  { value: 'internal',   label: 'Internal' },
  { value: 'attention',  label: 'Needs attention' },
];

function colorForName(name) {
  // Deterministic hue picker for newly added projects — keeps the UI
  // looking lived-in even before the backend assigns a colour.
  const palette = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9', '#DC2626', '#64748B', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function initialOf(name) {
  return ((name || '').trim().slice(0, 1) || '?').toUpperCase();
}

export default function ProjectMappingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const q           = searchParams.get('q') || '';
  const filter = FILTER_VALUES.has(filterParam) ? filterParam : 'all';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Modal control (add or edit)
  const [modalOpen,    setModalOpen]   = useState(false);
  const [modalMode,    setModalMode]   = useState('add'); // 'add' | 'edit'
  const [modalInitial, setModalInitial] = useState(null);
  const addTriggerRef = useRef(null);

  // Local list — server returns the initial set, but we prepend/patch
  // optimistically after a successful add/edit and reflect inline test results.
  const [projects, setProjects] = useState([]);

  // Fetch on first mount (filters are applied client-side for M0).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.admin.projects.list()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setProjects(d?.projects || []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'Failed to load projects.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Derived stats — live, so optimistic adds/edits show up.
  const stats = useMemo(() => {
    const totals = { total: 0, healthy: 0, failing: 0, unmapped: 0 };
    for (const p of projects) {
      totals.total++;
      if (p.status === 'ok') totals.healthy++;
      if (p.status === 'fail') totals.failing++;
      if (!p.key || p.tasks === 0) totals.unmapped++;
    }
    return totals;
  }, [projects]);

  // Filtered list (client-side).
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === 'client'    && p.kind !== 'CLIENT')   return false;
      if (filter === 'internal'  && p.kind !== 'INTERNAL') return false;
      if (filter === 'attention' && p.status !== 'fail')   return false;
      if (needle) {
        const hay = `${p.name || ''} ${p.key || ''} ${p.desc || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [projects, filter, q]);

  // URL helpers
  const updateParam = (key, value, defaultValue) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (!value || value === defaultValue) params.delete(key);
      else params.set(key, value);
      return params;
    }, { replace: false });
  };
  const setFilter = (next) => updateParam('filter', next, 'all');
  const setQ      = (next) => updateParam('q', next, '');

  // Add — POST /api/admin/projects, then prepend.
  const handleAdd = async (payload) => {
    const res = await api.admin.projects.create(payload);
    if (res && res.project) {
      const next = {
        id:       res.project.id,
        name:     res.project.name || payload.name,
        key:      res.project.jiraKey || res.project.key || payload.jiraKey,
        kind:     res.project.kind || payload.kind || 'CLIENT',
        desc:     res.project.desc || payload.desc || '',
        status:   res.project.status || 'ok',
        tasks:    res.project.tasks ?? 0,
        lastSync: new Date().toISOString(),
        initial:  initialOf(res.project.name || payload.name),
        color:    colorForName(res.project.name || payload.name),
      };
      setProjects((prev) => [next, ...prev]);
    }
    return res;
  };

  // Edit — optimistic local-state update only (mock lacks PUT; see issues log).
  const handleEdit = async (payload, ctx) => {
    const id = ctx?.initial?.id;
    if (id == null) return;
    // Best-effort backend call — fire-and-forget, swallow 404 (mock route absent).
    try {
      await api.admin.projects.update(id, payload);
    } catch {
      // Mock does not ship PUT yet — see docs/frontend-allpages-issues.md.
    }
    setProjects((prev) => prev.map((p) =>
      p.id === id
        ? {
            ...p,
            name:    payload.name,
            key:     payload.jiraKey,
            desc:    payload.desc,
            kind:    payload.kind,
            initial: initialOf(payload.name),
          }
        : p
    ));
  };

  const handleSubmit = (payload, ctx) =>
    ctx?.mode === 'edit' ? handleEdit(payload, ctx) : handleAdd(payload);

  // Row's inline Test — update status pill optimistically based on the result.
  const handleTestResult = ({ project, ok }) => {
    setProjects((prev) => prev.map((p) =>
      p.id === project.id
        ? { ...p, status: ok ? 'ok' : 'fail', lastSync: new Date().toISOString() }
        : p
    ));
  };

  const openAdd = () => {
    setModalMode('add');
    setModalInitial(null);
    setModalOpen(true);
  };
  const openEdit = (project) => {
    setModalMode('edit');
    setModalInitial({
      id:   project.id,
      name: project.name,
      key:  project.key,
      desc: project.desc,
      kind: project.kind,
    });
    setModalOpen(true);
  };

  // Filter chip definitions with live counts.
  const filterChips = FILTER_CHIP_DEFS.map((c) => ({
    ...c,
    count:
      c.value === 'all'       ? projects.length
    : c.value === 'client'    ? projects.filter((p) => p.kind === 'CLIENT').length
    : c.value === 'internal'  ? projects.filter((p) => p.kind === 'INTERNAL').length
    : c.value === 'attention' ? projects.filter((p) => p.status === 'fail').length
    :                           0,
  }));

  return (
    <AppShell innerClassName="page-mapping">
      <div className="page-mapping">

        {/* ADMIN TABS — shared with P14 + P16 */}
        <AdminTabs activeTab="projects" />

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>15</b>— Admin</span>
            </div>
            <h1>Project &harr; Jira Mapping</h1>
            <p className="page-head__sub">
              Map AutoClock projects to their Jira project keys. Worklogs land where you map them.
            </p>
          </div>

          <div className="page-head__right">
            <button
              ref={addTriggerRef}
              type="button"
              className="page-head__primary"
              onClick={openAdd}
            >
              Add mapping
            </button>
          </div>
        </header>

        {error && (
          <div className="error" role="alert">Couldn’t load projects — {error}</div>
        )}

        {/* KPI ROW */}
        <section className="mapping-kpis" aria-label="Mapping totals">
          <KpiCard
            variant="stat"
            label="Total mappings"
            value={loading ? '…' : stats.total}
            sub="across client + internal"
          />
          <KpiCard
            variant="stat"
            label="Healthy"
            value={loading ? '…' : stats.healthy}
            sub="reaching Jira OK"
            tone="ok"
          />
          <KpiCard
            variant="stat"
            label="Failing"
            value={loading ? '…' : stats.failing}
            sub="last test returned an error"
            tone={stats.failing > 0 ? 'alert' : 'default'}
          />
          <KpiCard
            variant="stat"
            label="Unmapped"
            value={loading ? '…' : stats.unmapped}
            sub="missing key or no tasks"
            tone={stats.unmapped > 0 ? 'warn' : 'default'}
          />
        </section>

        {/* FILTER ROW */}
        <section className="mapping-filters" aria-label="Filter projects">
          <FilterChips
            chips={filterChips}
            value={filter}
            onChange={setFilter}
            search={q}
            onSearch={setQ}
            searchPlaceholder="Search project, key, or description…"
            ariaLabel="Filter by kind"
          />
        </section>

        {/* PROJECT LIST */}
        <section className="mapping-list" role="table" aria-label="Project ↔ Jira mappings">
          {loading && (
            <div className="loading" role="status">Loading mappings…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty">
              No mappings match the current filters.
            </div>
          )}
          {!loading && filtered.map((p) => (
            <ProjectMappingRow
              key={p.id}
              project={p}
              onEdit={openEdit}
              onTestResult={handleTestResult}
            />
          ))}
        </section>

        <MappingFormModal
          open={modalOpen}
          mode={modalMode}
          initial={modalInitial}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          returnFocusTo={addTriggerRef}
        />
      </div>
    </AppShell>
  );
}
