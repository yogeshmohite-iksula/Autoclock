// team.js — PM / Lead team dashboard + per-member drill-in.
// EP-14 (team dashboard) with extended shape (range, members[].status,
// lastClose, weekTarget — OQ-AP-07). Member detail is OQ-AP-08 (new EP).

import { request } from './client';

export const teamApi = {
  /** GET /api/dashboard/team?team_id=&range=today|week|sprint|month */
  team({ teamId, range = 'today' } = {}) {
    const qs = new URLSearchParams();
    if (teamId != null) qs.set('team_id', String(teamId));
    qs.set('range', range);
    return request(`/api/dashboard/team?${qs}`);
  },

  /** GET /api/team/members/:id — single member 14-day history + tickets.
   *  Mocked until backend adds the route (OQ-AP-08). */
  member(memberId) {
    return request(`/api/team/members/${encodeURIComponent(memberId)}`);
  },
};
