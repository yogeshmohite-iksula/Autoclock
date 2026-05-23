// UsersRolesPage (P14) — admin user roster + invite modal.
//
// Source design: docs/FrontEnd Design /Users and Roles.html
// Extraction notes: /tmp/allpages-extraction-notes.md (P14 section).
//
// Route: /admin/users  (RequireAuth + RequireOnboarded + RequireRole admin).
// ERD:   EP-19 GET/POST/PUT /api/admin/users  (mocked).
//
// URL state:
//   ?role=all|employee|pm_lead|management|operations|admin   (default 'all')
//   ?status=all|active|invited|disabled                       (default 'all')
//   ?q=…                                                      (search)
//   ?subtab=users|roles|audit                                 (default 'users')
//
// Composition:
//   AppShell
//   ├── AdminTabs (active=users)
//   ├── page-head ("Users & Roles" | "Roles overview" | "Audit log")
//   ├── 4 KpiCards (active / invited / disabled / connections-missing)
//   ├── FilterChips (role) + FilterChips (status) + search
//   └── list of UserTableRow
//
// Shared admin components (also used by P15 + P16):
//   - AdminTabs, RoleChip, ConnectionDotsInline, UserTableRow, InviteUserModal

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '../api';
import AppShell from '../components/shell/AppShell';
import KpiCard from '../components/cards/KpiCard';
import FilterChips from '../components/filters/FilterChips';
import AdminTabs from '../components/admin/AdminTabs';
import UserTableRow from '../components/admin/UserTableRow';
import InviteUserModal from '../components/admin/InviteUserModal';

import '../styles/users-roles.css';

const ROLE_VALUES   = new Set(['all', 'employee', 'pm_lead', 'management', 'operations', 'admin']);
const STATUS_VALUES = new Set(['all', 'active', 'invited', 'disabled']);
const SUBTAB_VALUES = new Set(['users', 'roles', 'audit']);

const ROLE_CHIP_DEFS = [
  { value: 'all',         label: 'All' },
  { value: 'admin',       label: 'Admin' },
  { value: 'management',  label: 'Management' },
  { value: 'operations',  label: 'Operations' },
  { value: 'pm_lead',     label: 'PM Lead' },
  { value: 'employee',    label: 'Employee' },
];

const STATUS_CHIP_DEFS = [
  { value: 'all',      label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'invited',  label: 'Invited' },
  { value: 'disabled', label: 'Disabled' },
];

const ROLE_CARDS = [
  { role: 'employee',   label: 'Employee',   tone: 'default' },
  { role: 'pm_lead',    label: 'PM Lead',    tone: 'default' },
  { role: 'management', role_color: '#DC2626', label: 'Management', tone: 'default' },
  { role: 'operations', label: 'Operations', tone: 'default' },
  { role: 'admin',      label: 'Admin',      tone: 'default' },
];

const ROLE_BLURBS = {
  employee:   'Logs their workday. Sees only their own entries and history.',
  pm_lead:    'Logs their workday + sees their team’s hours and ticket effort.',
  management: 'Org-wide utilization & trends. No ticket detail.',
  operations: 'Chases the weekly 40-hour fill — Friday + Monday reminders.',
  admin:      'Manages users, roles, project ↔ Jira mapping, and integrations.',
};

export default function UsersRolesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam   = searchParams.get('role');
  const statusParam = searchParams.get('status');
  const subtabParam = searchParams.get('subtab');
  const q           = searchParams.get('q') || '';

  const role   = ROLE_VALUES.has(roleParam)     ? roleParam   : 'all';
  const status = STATUS_VALUES.has(statusParam) ? statusParam : 'all';
  const subtab = SUBTAB_VALUES.has(subtabParam) ? subtabParam : 'users';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteTriggerRef = useRef(null);

  // Local list — server returns the initial set, but we prepend optimistically
  // after a successful invite and reflect status changes after disable.
  const [users, setUsers] = useState([]);

  // Fetch on first mount (filters are applied client-side for M0 — the mock
  // returns all users — so we don't re-fetch when role/status change. When
  // the real backend lands, switch to passing { filter: role, status } in
  // the query and re-fetching here.)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.admin.users.list()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setUsers(d?.users || []);
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setError(e.message || 'Failed to load users.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Derived stats (live — they reflect the in-memory `users`, not the
  // server's initial snapshot — so optimistic adds/disables show up.)
  const stats = useMemo(() => {
    const totals = { active: 0, invited: 0, disabled: 0, connsMissing: 0 };
    for (const u of users) {
      if (u.status === 'active')   totals.active++;
      if (u.status === 'invited')  totals.invited++;
      if (u.status === 'disabled') totals.disabled++;
      if (u.conn && (u.conn.jira === 'miss' || u.conn.google === 'miss')) totals.connsMissing++;
    }
    return totals;
  }, [users]);

  // Filtered list (client-side).
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter(u => {
      if (role !== 'all' && u.role !== role) return false;
      if (status !== 'all' && u.status !== status) return false;
      if (needle) {
        const hay = `${u.name} ${u.email} ${u.team || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [users, role, status, q]);

  // URL helpers
  const updateParam = (key, value, defaultValue) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (!value || value === defaultValue) params.delete(key);
      else params.set(key, value);
      return params;
    }, { replace: false });
  };
  const setRole   = (next) => updateParam('role', next, 'all');
  const setStatus = (next) => updateParam('status', next, 'all');
  const setQ      = (next) => updateParam('q', next, '');
  const setSubtab = (next) => updateParam('subtab', next, 'users');

  // Invite modal — fires api.admin.users.invite(...) and prepends on success.
  const handleInvite = async (payload) => {
    const res = await api.admin.users.invite(payload);
    if (res && res.user) {
      // The mock returns just the bare invitee — augment with sensible UI defaults
      // (initials, hue, conn=miss/miss because they haven't connected yet).
      const next = {
        id: res.user.id,
        name: res.user.name || payload.name,
        email: res.user.email || payload.email,
        role: res.user.role || payload.role,
        team: res.user.team || payload.team,
        status: res.user.status || 'invited',
        conn: { jira: 'miss', google: 'miss' },
        joined: new Date().toISOString().slice(0, 10),
        initial: (payload.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'N',
        hue: '#0EA5E9',
      };
      setUsers((prev) => [next, ...prev]);
    }
    return res;
  };

  // Disable — PUT /api/admin/users/:id { status: 'disabled' }
  const handleDisable = async (user) => {
    if (!user || user.status === 'disabled') return;
    if (typeof window !== 'undefined' && !window.confirm(`Disable ${user.name}? They’ll lose access until re-enabled.`)) return;
    try {
      await api.admin.users.update(user.id, { status: 'disabled' });
      setUsers((prev) => prev.map(u => u.id === user.id ? { ...u, status: 'disabled' } : u));
    } catch (e) {
      // Surface the error inline — minimal failure recovery for M0.
      setError(e?.message || 'Could not disable user.');
    }
  };

  // Edit — for M0 we keep it a no-op-with-toast. When P14 lands a full edit
  // modal later, lift it here.
  const handleEdit = (user) => {
    if (typeof window !== 'undefined') {
      window.alert(`Edit user dialog is not implemented yet — for ${user.name}. (P14 follow-up.)`);
    }
  };

  // Filter chip definitions with live counts.
  const roleChips = ROLE_CHIP_DEFS.map(c => ({
    ...c,
    count: c.value === 'all'
      ? users.length
      : users.filter(u => u.role === c.value).length,
  }));
  const statusChips = STATUS_CHIP_DEFS.map(c => ({
    ...c,
    count: c.value === 'all'
      ? users.length
      : users.filter(u => u.status === c.value).length,
  }));

  return (
    <AppShell innerClassName="page-users">
      <div className="page-users">

        {/* ADMIN TABS — shared with P15 + P16 */}
        <AdminTabs activeTab="users" />

        {/* PAGE HEAD */}
        <header className="page-head">
          <div className="page-head__left">
            <div className="page-head__eyebrow">
              <span className="page-head__badge"><b>14</b>— Admin</span>
              <span className="page-head__sub-tabs" role="tablist" aria-label="Users tab subview">
                <button
                  type="button"
                  role="tab"
                  aria-selected={subtab === 'users'}
                  className={`page-head__sub-tab${subtab === 'users' ? ' is-active' : ''}`}
                  onClick={() => setSubtab('users')}
                >
                  Users
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={subtab === 'roles'}
                  className={`page-head__sub-tab${subtab === 'roles' ? ' is-active' : ''}`}
                  onClick={() => setSubtab('roles')}
                >
                  Roles
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={subtab === 'audit'}
                  className={`page-head__sub-tab${subtab === 'audit' ? ' is-active' : ''}`}
                  onClick={() => setSubtab('audit')}
                >
                  Audit
                </button>
              </span>
            </div>
            <h1>
              {subtab === 'audit' ? 'Audit log' : subtab === 'roles' ? 'Roles overview' : 'Users & Roles'}
            </h1>
            <p className="page-head__sub">
              {subtab === 'audit'
                ? 'A timeline of admin actions and external writes.'
                : subtab === 'roles'
                  ? 'What each role can see and do.'
                  : 'Invite new teammates, change roles, and disable access.'}
            </p>
          </div>

          {subtab === 'users' && (
            <div className="page-head__right">
              <button
                ref={inviteTriggerRef}
                type="button"
                className="page-head__primary"
                onClick={() => setInviteOpen(true)}
              >
                Invite a new user
              </button>
            </div>
          )}
        </header>

        {error && (
          <div className="error" role="alert">Couldn’t load users — {error}</div>
        )}

        {/* USERS SUBTAB */}
        {subtab === 'users' && (
          <>
            {/* KPI ROW */}
            <section className="users-kpis" aria-label="User totals">
              <KpiCard
                variant="stat"
                label="Active"
                value={loading ? '…' : stats.active}
                sub="have signed in"
              />
              <KpiCard
                variant="stat"
                label="Invited"
                value={loading ? '…' : stats.invited}
                sub="awaiting first sign-in"
              />
              <KpiCard
                variant="stat"
                label="Disabled"
                value={loading ? '…' : stats.disabled}
                sub="no access"
              />
              <KpiCard
                variant="stat"
                label="Connections missing"
                value={loading ? '…' : stats.connsMissing}
                sub="Jira or Google not connected"
                tone={stats.connsMissing > 0 ? 'warn' : 'default'}
              />
            </section>

            {/* FILTER ROW */}
            <section className="users-filters" aria-label="Filter users">
              <FilterChips
                chips={roleChips}
                value={role}
                onChange={setRole}
                ariaLabel="Filter by role"
              />
              <FilterChips
                chips={statusChips}
                value={status}
                onChange={setStatus}
                search={q}
                onSearch={setQ}
                searchPlaceholder="Search name or email…"
                ariaLabel="Filter by status"
              />
            </section>

            {/* USER LIST */}
            <section className="users-list" role="table" aria-label="Users">
              {loading && (
                <div className="loading" role="status">Loading users…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="empty">
                  No users match the current filters.
                </div>
              )}
              {!loading && filtered.map((u) => (
                <UserTableRow
                  key={u.id}
                  user={u}
                  onEdit={handleEdit}
                  onDisable={handleDisable}
                />
              ))}
            </section>
          </>
        )}

        {/* ROLES SUBTAB — for M0 this is a light overview reusing the role
            counts from the user roster. Per OQ-AP-15 the dedicated Roles
            permission editor lands later. */}
        {subtab === 'roles' && (
          <section className="roles-overview" aria-label="Roles overview">
            {ROLE_CARDS.map((r) => (
              <div key={r.role} className="role-card" data-role={r.role}>
                <header className="role-card__head">
                  <h3>{r.label}</h3>
                  <span className="role-card__count">
                    {(users.filter(u => u.role === r.role).length)}
                  </span>
                </header>
                <p>{ROLE_BLURBS[r.role]}</p>
              </div>
            ))}
          </section>
        )}

        {/* AUDIT SUBTAB — stub per OQ-AP-15 */}
        {subtab === 'audit' && (
          <section className="audit-stub" aria-label="Audit log">
            <div className="audit-stub__icon" aria-hidden="true">A</div>
            <h2>Coming soon</h2>
            <p>
              Once <code>GET /api/admin/audit</code> ships (OQ-AP-15), the full audit log
              will live here — admin actions, role changes, and external writes
              with their <code>external_writes</code> IDs.
            </p>
          </section>
        )}

        <InviteUserModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onSubmit={handleInvite}
          returnFocusTo={inviteTriggerRef}
        />
      </div>
    </AppShell>
  );
}
