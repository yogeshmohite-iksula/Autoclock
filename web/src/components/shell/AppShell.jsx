// AppShell — the one shared layout for every in-app page (Today, dashboards,
// admin, settings, …). Owns: sidebar collapse (desktop), drawer (mobile),
// and ESC + route-change close. Pages render their content as children inside
// <main className="tdy-main"><div className="tdy-main-inner">{children}</div></main>.
//
// CSS: app-shell.css adds drawer-specific overrides on top of today.css
// (which still owns the topbar/sidebar/body-grid styles for backwards
// compatibility — see docs/frontend-allpages-plan.md §3).

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import TopBar from './TopBar';
import Sidebar from './Sidebar';

import '../../styles/today.css';     // existing shell + Today body classes
import '../../styles/app-shell.css';  // mobile drawer + a-bit-of-polish on top

export default function AppShell({ children, mainClassName = '', innerClassName = '' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Sidebar collapse → body attribute so today.css can react
  useEffect(() => {
    document.body.dataset.tdyCollapsed = String(collapsed);
    return () => { document.body.dataset.tdyCollapsed = 'false'; };
  }, [collapsed]);

  // Close the drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // ESC closes the drawer
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Lock body scroll while the drawer is open (mobile)
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  const toggleDrawer = useCallback(() => setDrawerOpen(v => !v), []);

  return (
    <div className={`tdy-root${drawerOpen ? ' is-drawer-open' : ''}`} data-drawer={drawerOpen ? 'open' : 'closed'}>
      <TopBar onToggleDrawer={toggleDrawer} drawerOpen={drawerOpen} />

      <div className="tdy-body-grid">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        {drawerOpen && (
          <button
            type="button"
            className="tdy-drawer-backdrop"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        <main className={`tdy-main ${mainClassName}`}>
          <div className={`tdy-main-inner ${innerClassName}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
