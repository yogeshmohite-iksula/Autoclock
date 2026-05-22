// EP-14, EP-15 — dashboards (PM team scope + Management org scope).
// EP-15 is M1 — included here so the legacy /dashboard route can wire it up later.

import { request } from './client';

export const dashboardApi = {
  /** EP-14 — PM/Lead team metrics. */
  team: () => request('/api/dashboard/team'),

  /** EP-15 — Management org metrics. (M1 — server returns a 501 today.) */
  org: () => request('/api/dashboard/org'),
};
