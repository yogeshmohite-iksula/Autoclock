// App.jsx — LEGACY layout shell.
// The new screens (SignInPage, OnboardingPage, TodayPage) render their own chrome.
// This shell is only used by the legacy /log, /preview, /dashboard stub routes that
// other swimlanes' PRs depend on. Keep minimal — do not invest design effort here.

import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100%' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'var(--ac-surface)',
          borderBottom: '1px solid var(--ac-border)',
          boxShadow: 'var(--ac-shadow-sm)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: 'var(--ac-primary)' }}>AutoClock · legacy</h1>
        <nav style={{ display: 'flex', gap: 8 }}>
          <NavLink to="/log" className={({ isActive }) => (isActive ? 'ac-btn ac-btn--sm ac-btn--primary' : 'ac-btn ac-btn--sm ac-btn--ghost')}>Log</NavLink>
          <NavLink to="/preview" className={({ isActive }) => (isActive ? 'ac-btn ac-btn--sm ac-btn--primary' : 'ac-btn ac-btn--sm ac-btn--ghost')}>Preview</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'ac-btn ac-btn--sm ac-btn--primary' : 'ac-btn ac-btn--sm ac-btn--ghost')}>Dashboard</NavLink>
        </nav>
      </header>
      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
      <footer style={{ padding: 12, textAlign: 'center', color: 'var(--ac-text-muted)' }}>
        <small>Legacy shell — see <code>/sign-in → /onboarding → /today</code> for the real flow.</small>
      </footer>
    </div>
  );
}
