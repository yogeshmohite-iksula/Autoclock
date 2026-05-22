// AuthContext — single source of truth for { user, isAuthed, onboardingComplete }.
// Backed by api.auth.me() on boot. Mocks live in api/mocks.js; swapping mock → real
// is a one-flag change in api/client.js.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Boot: try to resolve the current session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.auth.me();
        if (!cancelled) setUser(res?.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email) => {
    const res = await api.auth.login({ email });
    setUser(res?.user || null);
    return res?.user;
  }, []);

  const signOut = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    setUser(null);
  }, []);

  // Helpers
  const isAuthed = !!user;
  // For M0, onboarding_status === 'connected' means both Jira + Google are wired up.
  const onboardingComplete = !!user && user.onboarding_status === 'connected';

  const value = { user, loading, isAuthed, onboardingComplete, signIn, signOut, setUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
