import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="brand">AutoClock</h1>
        <nav className="app-nav">
          <NavLink to="/log">Log</NavLink>
          <NavLink to="/preview">Preview</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <small>AutoClock — zero cost, built for the real 60. (HackFest 2026)</small>
      </footer>
    </div>
  );
}
