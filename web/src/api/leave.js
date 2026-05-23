// leave.js — Leave & holiday calendar.
// EP-21 GET/POST /api/leave. OQ-AP-11: holidays returned alongside in the
// same response so we don't need a sister endpoint.

import { request } from './client';

export const leaveApi = {
  /** GET /api/leave?month=YYYY-MM — returns leave + holidays for the month. */
  list({ month } = {}) {
    const qs = new URLSearchParams();
    if (month) qs.set('month', month);
    return request(`/api/leave${qs.toString() ? `?${qs}` : ''}`);
  },

  /** POST /api/leave { pid, start, end, reason } */
  add(payload) {
    return request('/api/leave', { method: 'POST', body: payload });
  },
};
