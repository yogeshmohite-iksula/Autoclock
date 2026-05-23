// AdminTabs — top tab strip for the admin console.
// Shared across P14 (Users & Roles), P15 (Project Mapping), P16 (Integrations).
//
// a11y: rendered as `role="tablist"` + `<NavLink>`s with `role="tab"` and
// `aria-current`. Clicking switches the route (history-driven, not local
// state) so the back/forward button and deep links work.
//
// The "Audit" tab is a stub for OQ-AP-15 — it points to `/admin/users?subtab=audit`
// (P14 renders "coming soon" content). When EP-23 audit lands, we wire it to
// its own route + page.

import { NavLink } from 'react-router-dom';
import './AdminTabs.css';

// activeTab: 'users' | 'projects' | 'integrations' | 'audit'  — used to set the
// `aria-current` flag on the matching link without relying on URL matching
// alone (the Audit "tab" lives under /admin/users with ?subtab=audit).
export default function AdminTabs({ activeTab }) {
  const tabs = [
    { key: 'users',        label: 'Users',        to: '/admin/users' },
    { key: 'projects',     label: 'Projects',     to: '/admin/projects' },
    { key: 'integrations', label: 'Integrations', to: '/admin/integrations' },
    { key: 'audit',        label: 'Audit',        to: '/admin/users?subtab=audit' },
  ];

  return (
    <nav className="ac-admin-tabs" role="tablist" aria-label="Admin sections">
      {tabs.map((t) => {
        const isActive = t.key === activeTab;
        return (
          <NavLink
            key={t.key}
            to={t.to}
            role="tab"
            className={({ isActive: routerActive }) =>
              `ac-admin-tabs__tab${(isActive || (routerActive && !activeTab)) ? ' is-active' : ''}`
            }
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={isActive ? 0 : -1}
            end
          >
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
