// settings.js — User-scope settings (the /settings page).
// Distinct from EP-22 (global / admin). OQ-AP-04: backend doesn't expose
// these yet — mocked locally; `me.update` is the standard PUT shape.

import { request } from './client';

export const settingsApi = {
  me: {
    /** GET /api/me/settings */
    get() {
      return request('/api/me/settings');
    },
    /** PUT /api/me/settings { profile?, reminders?, appearance? } */
    update(payload) {
      return request('/api/me/settings', { method: 'PUT', body: payload });
    },
  },
};
