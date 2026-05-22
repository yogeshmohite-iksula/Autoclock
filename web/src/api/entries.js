// EP-08..EP-11 — worklog-entry CRUD.

import { request } from './client';

export const entriesApi = {
  /** EP-08 — entries for one date. Response: { entries: [...] } */
  list: (date) => request(`/api/entries?date=${encodeURIComponent(date)}`),

  /** EP-09 — create an entry. */
  create: (entry) => request('/api/entries', { method: 'POST', body: entry }),

  /** EP-10 — edit. */
  update: (id, patch) => request(`/api/entries/${id}`, { method: 'PUT', body: patch }),

  /** EP-11 — delete. */
  remove: (id) => request(`/api/entries/${id}`, { method: 'DELETE' }),
};
