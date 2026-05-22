// EP-06, EP-07 — projects + their Jira tasks (dependent dropdowns).

import { request } from './client';

export const projectsApi = {
  /** EP-06 — list active projects. Response: { projects: [...] } */
  list: () => request('/api/projects'),

  /** EP-07 — Jira tasks for a project. Response: { tasks: [...] } */
  tasks: (projectId) => request(`/api/projects/${encodeURIComponent(projectId)}/tasks`),
};
