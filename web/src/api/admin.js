// admin.js — Admin: users, projects (Jira mapping), global settings.
// EP-19 users, EP-20 projects, EP-22 settings (global). Project-test sub-EP
// (OQ-AP-12) added here as `projects.test`.

import { request } from './client';

export const adminApi = {
  users: {
    /** GET /api/admin/users?filter=&status= */
    list({ filter, status } = {}) {
      const qs = new URLSearchParams();
      if (filter) qs.set('filter', filter);
      if (status) qs.set('status', status);
      return request(`/api/admin/users${qs.toString() ? `?${qs}` : ''}`);
    },
    /** POST /api/admin/users  { name, email, role, teamId } */
    invite(payload) {
      return request('/api/admin/users', { method: 'POST', body: payload });
    },
    /** PUT /api/admin/users/:id  { role?, teamId?, status? } */
    update(id, payload) {
      return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
    },
  },

  projects: {
    /** GET /api/admin/projects?filter= */
    list({ filter } = {}) {
      const qs = new URLSearchParams();
      if (filter) qs.set('filter', filter);
      return request(`/api/admin/projects${qs.toString() ? `?${qs}` : ''}`);
    },
    /** POST /api/admin/projects { name, jiraKey, kind, desc } */
    create(payload) {
      return request('/api/admin/projects', { method: 'POST', body: payload });
    },
    /** POST /api/admin/projects/test { jiraKey } — OQ-AP-12. */
    test({ jiraKey } = {}) {
      return request('/api/admin/projects/test', { method: 'POST', body: { jiraKey } });
    },
  },

  settings: {
    /** GET /api/admin/settings — global settings (TB-11). */
    get() {
      return request('/api/admin/settings');
    },
    /** PUT /api/admin/settings { section?, body? } — section-scoped per OQ-AP-13. */
    update(payload) {
      return request('/api/admin/settings', { method: 'PUT', body: payload });
    },
  },
};
