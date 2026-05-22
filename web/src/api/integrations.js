// integrations.js — Admin integrations page (Jira / Google / Email / Reader).
// Reads/writes EP-22 with a section scope (OQ-AP-13).

import { request } from './client';

export const integrationsApi = {
  /** GET /api/admin/integrations — section-grouped view of EP-22 settings. */
  get() {
    return request('/api/admin/integrations');
  },

  /** PUT /api/admin/integrations { section, body } — e.g. { section:'jira', body:{ workspaceUrl } } */
  update(payload) {
    return request('/api/admin/integrations', { method: 'PUT', body: payload });
  },
};
