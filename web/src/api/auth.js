// EP-01..EP-05 — sign-in + per-provider OAuth start/callback.
// Connect URLs aren't request methods; they're plain strings the page
// redirects to via window.location.assign(...). Callbacks are handled
// server-side, not called from the SPA.

import { request } from './client';

export const authApi = {
  /** EP-01 — sign in. Mock accepts any @iksula.com email. */
  login: ({ email }) =>
    request('/api/auth/login', { method: 'POST', body: { email } }),

  /** Helper for AuthContext: resolve current session (or 401). */
  me: () => request('/api/auth/me'),

  /** Helper: clear session. */
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  /** EP-02 — Connect Jira (returns a URL; page does window.location.assign). */
  jiraConnectUrl: () => '/api/auth/jira/connect',

  /** EP-04 — Connect Google (returns a URL). */
  googleConnectUrl: () => '/api/auth/google/connect',
};
