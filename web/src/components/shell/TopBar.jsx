// TopBar — the shell's top strip. Brand · live IST date pill · search/help/
// notifications · user menu. Extracted from TodayPage.jsx for reuse across
// all in-app pages. On mobile a hamburger appears on the left.

import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useAuth } from '../../auth/AuthContext';
import { initials } from '../../lib/format';

const ROLE_LABELS = {
  employee: 'Employee', pm_lead: 'PM / Lead',
  management: 'Management', operations: 'Operations', admin: 'Admin',
};

function isoWeek(d) {
  const t = new Date(d.valueOf());
  const dn = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - dn + 3);
  const firstThu = t.valueOf();
  t.setMonth(0, 1);
  if (t.getDay() !== 4) t.setMonth(0, 1 + ((4 - t.getDay()) + 7) % 7);
  return Math.ceil((firstThu - t) / 604800000) + 1;
}

export default function TopBar({ onToggleDrawer, drawerOpen }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const now = new Date();
  const dateLong = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric',
  });
  const yr = now.getFullYear();
  const istClock = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);

  const onSignOut = async () => { await signOut(); navigate('/sign-in', { replace: true }); };

  return (
    <div className="tdy-topbar">
      {/* Mobile hamburger — visible only at ≤720px via CSS */}
      <button
        type="button"
        className="tdy-hamburger"
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={drawerOpen ? 'true' : 'false'}
        onClick={onToggleDrawer}
      >
        <Icon name={drawerOpen ? 'x' : 'menu'} />
      </button>

      <a className="tdy-brand" href="/today" aria-label="AutoClock home">
        <span className="tdy-brand-mark" aria-hidden="true"><span className="face" /></span>
        <span className="tdy-wordmark">AutoClock</span>
      </a>

      <div className="tdy-topbar-center">
        <div className="tdy-date-pill">
          <span className="day">{dateLong}, {yr}</span>
          <span className="sep" />
          <span className="clock">{istClock} IST</span>
          <span className="sep" />
          <span className="week">W{isoWeek(now)}</span>
        </div>
      </div>

      <div className="tdy-topbar-right">
        <button type="button" className="tdy-icon-btn" aria-label="Search"><Icon name="search" /></button>
        <button type="button" className="tdy-icon-btn" aria-label="Help"><Icon name="help" /></button>
        <button type="button" className="tdy-icon-btn" aria-label="Notifications">
          <Icon name="bell" /><span className="badge">2</span>
        </button>
        <button type="button" className="tdy-user-menu" onClick={onSignOut} title="Sign out">
          <span className="tdy-avatar">{initials(user?.name || '')}</span>
          <div className="tdy-user-meta">
            <div className="name">{user?.name || ''}</div>
            <div className="role">{ROLE_LABELS[user?.role] || 'Employee'}</div>
          </div>
          <span className="caret">▾</span>
        </button>
      </div>
    </div>
  );
}
