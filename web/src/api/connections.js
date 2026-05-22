// Onboarding connection status — MOCK ONLY for now.
// There is no ERD endpoint for this yet (flagged as OQ-F3 in docs/frontend-plan.md).
// When the backend adds GET /api/auth/connections (or extends GET /api/auth/me with
// per-provider booleans), this file is the one place to update.

import { request } from './client';
import { setConnectionStatus as setMockStatus } from './mocks';

export const connectionsApi = {
  /**
   * Returns { jira, google } where each is one of:
   *   'idle' | 'connecting' | 'connected' | 'expired'
   */
  status: () => request('/api/auth/connections'),

  /** Mock-only helper used by OnboardingPage demo controls. */
  _setMockStatus: setMockStatus,
};
