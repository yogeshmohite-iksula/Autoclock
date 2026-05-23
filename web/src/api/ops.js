// ops.js — Operations console: weekly compliance, Fri/Mon reminder runs.
// EP-16 compliance, EP-17 run-check, EP-18 reminder history.

import { request } from './client';

export const opsApi = {
  /** GET /api/ops/compliance?week=NN */
  compliance({ week } = {}) {
    const qs = new URLSearchParams();
    if (week != null) qs.set('week', String(week));
    return request(`/api/ops/compliance${qs.toString() ? `?${qs}` : ''}`);
  },

  /** POST /api/ops/run-check { type: 'friday'|'monday'|'manual', recipientIds?: number[] } */
  runCheck({ type, recipientIds } = {}) {
    return request('/api/ops/run-check', { method: 'POST', body: { type, recipientIds } });
  },

  /** GET /api/ops/reminders?filter= */
  reminders({ filter } = {}) {
    const qs = new URLSearchParams();
    if (filter) qs.set('filter', filter);
    return request(`/api/ops/reminders${qs.toString() ? `?${qs}` : ''}`);
  },
};
