// EP-14, EP-15 — dashboards (PM team scope + Management org scope).
// EP-15 is M1 — included here so the legacy /dashboard route can wire it up later.

import { request } from './client';

export const dashboardApi = {
  /** EP-14 — PM/Lead team metrics. Accepts optional teamId + range. */
  team({ teamId, range = 'today' } = {}) {
    const qs = new URLSearchParams();
    if (teamId != null) qs.set('team_id', String(teamId));
    qs.set('range', range);
    return request(`/api/dashboard/team?${qs}`);
  },

  /** EP-15 — Management org metrics. Range: week|month|quarter (OQ-AP-09). */
  org({ range = 'week' } = {}) {
    const qs = new URLSearchParams();
    qs.set('range', range);
    return request(`/api/dashboard/org?${qs}`);
  },
};
