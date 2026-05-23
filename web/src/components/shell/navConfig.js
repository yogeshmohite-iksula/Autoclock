// Sidebar nav configuration. The shipped app uses the ERD role keys
// (`employee`, `pm_lead`, `management`, `operations`, `admin`) — see OQ-AP-01.
// Each role gets one additional section item; sub-pages are reached via
// top tabs inside that section (OQ-AP-02).

export const BASE_NAV = [
  { key: 'today',   label: 'Today',      icon: 'today',   meta: 'T', href: '/today' },
  { key: 'history', label: 'My History', icon: 'history', meta: null, href: '/history' },
];

export const ROLE_EXTRA = {
  pm_lead:    [{ key: 'team',    label: 'My Team',        icon: 'team',    href: '/team' }],
  management: [{ key: 'org',     label: 'Organization',   icon: 'org',     href: '/org' }],
  operations: [{ key: 'comp',    label: 'Compliance',     icon: 'comp',    href: '/ops/compliance' }],
  admin:      [{ key: 'console', label: 'Admin Console',  icon: 'console', href: '/admin/users' }],
};

export const FOOT_NAV = [
  { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
];

/** Compose the nav for a given role. Admin sees everything. */
export function navFor(role) {
  const main = [...BASE_NAV];
  const extras = role === 'admin'
    ? [...(ROLE_EXTRA.pm_lead || []), ...(ROLE_EXTRA.management || []),
       ...(ROLE_EXTRA.operations || []), ...(ROLE_EXTRA.admin || [])]
    : (ROLE_EXTRA[role] || []);
  return { workspace: main, role: extras, footer: FOOT_NAV };
}
