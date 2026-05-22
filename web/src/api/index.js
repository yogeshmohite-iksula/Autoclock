// api/index.js — single source of truth for the frontend API surface.
// New code: `import { api } from '@/api';` then `api.auth.login(...)`.
// EP-14..EP-23 not yet wrapped by these three screens — see docs/frontend-plan.md.

export { request, USE_MOCKS } from './client';
export { authApi }        from './auth';
export { connectionsApi } from './connections';
export { projectsApi }    from './projects';
export { entriesApi }     from './entries';
export { dayApi }         from './day';
export { dashboardApi }   from './dashboard';

import { authApi }        from './auth';
import { connectionsApi } from './connections';
import { projectsApi }    from './projects';
import { entriesApi }     from './entries';
import { dayApi }         from './day';
import { dashboardApi }   from './dashboard';

export const api = {
  auth:        authApi,
  connections: connectionsApi,
  projects:    projectsApi,
  entries:     entriesApi,
  day:         dayApi,
  dashboard:   dashboardApi,
};
