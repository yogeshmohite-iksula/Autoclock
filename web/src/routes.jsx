// routes.jsx — route table + guards.
// New screens: /sign-in, /onboarding, /today.
// Legacy /log /preview /dashboard kept under the same Layout so other swimlanes don't break.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

import SignInPage from './pages/SignInPage';
import OnboardingPage from './pages/OnboardingPage';
import TodayPage from './pages/TodayPage';
import CloseMyDayPage from './pages/CloseMyDayPage';
import SyncResultPage from './pages/SyncResultPage';
import SettingsPage from './pages/SettingsPage';
import MyHistoryPage from './pages/MyHistoryPage';
import TeamDashboardPage from './pages/TeamDashboardPage';
import TeamMemberDetailPage from './pages/TeamMemberDetailPage';
import ManagementDashboardPage from './pages/ManagementDashboardPage';
import ComplianceConsolePage from './pages/ComplianceConsolePage';
import ReminderHistoryPage from './pages/ReminderHistoryPage';

// Legacy stubs (kept so /log, /preview, /dashboard work for Yogesh / Keval / Ali).
import App from './App';
import LogPage from './pages/LogPage';
import PreviewPage from './pages/PreviewPage';
import DashboardPage from './pages/DashboardPage';

function RequireAuth({ children }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return null;
  if (!isAuthed) return <Navigate to="/sign-in" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const { onboardingComplete, loading } = useAuth();
  if (loading) return null;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

/** Role-gated route guard. `admin` is always allowed.
 *  Used by the 14 new pages — server-side RBAC is the source of truth (ERD §8). */
// eslint-disable-next-line react-refresh/only-export-components
export function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  const allowed = new Set([...roles, 'admin']);
  if (!allowed.has(user.role)) return <Navigate to="/today" replace />;
  return children;
}

function RootIndex() {
  const { isAuthed, onboardingComplete, loading } = useAuth();
  if (loading) return null;
  if (!isAuthed) return <Navigate to="/sign-in" replace />;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/today" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootIndex />} />

      {/* New screens */}
      <Route path="/sign-in" element={<SignInPage />} />
      <Route
        path="/onboarding"
        element={<RequireAuth><OnboardingPage /></RequireAuth>}
      />
      <Route
        path="/today"
        element={<RequireAuth><RequireOnboarded><TodayPage /></RequireOnboarded></RequireAuth>}
      />
      <Route
        path="/close"
        element={<RequireAuth><RequireOnboarded><CloseMyDayPage /></RequireOnboarded></RequireAuth>}
      />
      <Route
        path="/close/result"
        element={<RequireAuth><RequireOnboarded><SyncResultPage /></RequireOnboarded></RequireAuth>}
      />
      <Route
        path="/settings"
        element={<RequireAuth><RequireOnboarded><SettingsPage /></RequireOnboarded></RequireAuth>}
      />
      <Route
        path="/history"
        element={<RequireAuth><RequireOnboarded><MyHistoryPage /></RequireOnboarded></RequireAuth>}
      />
      <Route
        path="/team"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole roles={['pm_lead']}>
                <TeamDashboardPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        }
      />
      <Route
        path="/team/:memberId"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole roles={['pm_lead']}>
                <TeamMemberDetailPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        }
      />
      <Route
        path="/org"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole roles={['management']}>
                <ManagementDashboardPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        }
      />
      <Route
        path="/ops/compliance"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole roles={['operations']}>
                <ComplianceConsolePage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        }
      />
      <Route
        path="/ops/reminders"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole roles={['operations']}>
                <ReminderHistoryPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        }
      />

      {/* Legacy stubs under the original shell */}
      <Route element={<App />}>
        <Route path="/log" element={<LogPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
