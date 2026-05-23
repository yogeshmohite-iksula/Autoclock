// Onboarding connection status — MOCK ONLY for now.
// There is no ERD endpoint for this yet (flagged as OQ-F3 in docs/frontend-plan.md).
// When the backend adds GET /api/auth/connections (or extends GET /api/auth/me with
// per-provider booleans), this file is the one place to update.

import { request } from './client';
import { setConnectionStatus as setMockStatus, setMockOnboardingComplete } from './mocks';

export const connectionsApi = {
  /**
   * Returns { jira, google } where each is one of:
   *   'idle' | 'connecting' | 'connected' | 'expired'
   */
  status: () => request('/api/auth/connections'),

  /** Mock-only helper used by OnboardingPage demo controls. */
  _setMockStatus: setMockStatus,

  /** Mock-only helper used by OnboardingPage.onFinish so a /today refresh
   *  in mock mode keeps the onboarded user signed in. No-op in real mode. */
  _setMockOnboardingComplete: setMockOnboardingComplete,
};
