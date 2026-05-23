// history.js — per-user multi-day history.
// Maps to EP-08 extended with date-range (?from=YYYY-MM-DD&to=YYYY-MM-DD).
// OQ-AP-06: backend currently exposes single-`date` only — mocked here.

import { request } from './client';

export const historyApi = {
  /** GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD */
  list({ from, to } = {}) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    return request(`/api/history${qs.toString() ? `?${qs}` : ''}`);
  },
};
