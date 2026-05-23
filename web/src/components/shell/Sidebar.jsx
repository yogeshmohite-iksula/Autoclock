// Sidebar — workspace nav + role section + footer. Active state derived
// from the current route. On desktop a Collapse button shrinks to icons.
// On mobile this is the drawer body (open/close controlled by AppShell).

import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../Icon';
import { navFor } from './navConfig';
import { useAuth } from '../../auth/AuthContext';

function isActive(pathname, href) {
  if (href === pathname) return true;
  // Treat /ops/* siblings as part of the same section nav item, etc.
  const section = href.split('/').filter(Boolean)[0];
  return section ? pathname.split('/').filter(Boolean)[0] === section && href === pathname : false;
}

function NavItem({ item, current }) {
  const active = isActive(current, item.href);
  return (
    <NavLink to={item.href} className={`tdy-nav-item${active ? ' active' : ''}`} end>
      <span className="tdy-nav-icon"><Icon name={item.icon} /></span>
      <span className="label">{item.label}</span>
      {item.meta ? <span className="meta">{item.meta}</span> : null}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role || 'employee';
  const nav = navFor(role);

  return (
    <aside className="tdy-sidebar" aria-label="Primary">
      <nav className="tdy-nav-section">
        <div className="tdy-nav-header"><span>Workspace</span><span className="hr" /></div>
        {nav.workspace.map((it) => <NavItem key={it.key} item={it} current={pathname} />)}
        {nav.role.map((it) => <NavItem key={it.key} item={it} current={pathname} />)}
      </nav>

      <div className="tdy-nav-section">
        <div className="tdy-nav-header"><span>You</span><span className="hr" /></div>
        {nav.footer.map((it) => <NavItem key={it.key} item={it} current={pathname} />)}
      </div>

      <div className="tdy-sidebar-spacer" />

      <button type="button" className="tdy-collapse-btn" onClick={onToggle}>
        <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
        <span className="label">Collapse</span>
      </button>
    </aside>
  );
}
