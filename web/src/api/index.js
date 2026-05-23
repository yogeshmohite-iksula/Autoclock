// api/index.js — single source of truth for the frontend API surface.
// New code: `import { api } from '@/api';` then `api.auth.login(...)`.

export { request, USE_MOCKS } from './client';

export { authApi }         from './auth';
export { connectionsApi }  from './connections';
export { projectsApi }     from './projects';
export { entriesApi }      from './entries';
export { dayApi }          from './day';
export { dashboardApi }    from './dashboard';
// Added in feat/frontend-allpages — see docs/frontend-allpages-plan.md §6.
export { historyApi }      from './history';
export { teamApi }         from './team';
export { opsApi }          from './ops';
export { leaveApi }        from './leave';
export { adminApi }        from './admin';
export { settingsApi }     from './settings';
export { integrationsApi } from './integrations';

import { authApi }         from './auth';
import { connectionsApi }  from './connections';
import { projectsApi }     from './projects';
import { entriesApi }      from './entries';
import { dayApi }          from './day';
import { dashboardApi }    from './dashboard';
import { historyApi }      from './history';
import { teamApi }         from './team';
import { opsApi }          from './ops';
import { leaveApi }        from './leave';
import { adminApi }        from './admin';
import { settingsApi }     from './settings';
import { integrationsApi } from './integrations';

export const api = {
  auth:         authApi,
  connections:  connectionsApi,
  projects:     projectsApi,
  entries:      entriesApi,
  day:          dayApi,
  dashboard:    dashboardApi,
  history:      historyApi,
  team:         teamApi,
  ops:          opsApi,
  leave:        leaveApi,
  admin:        adminApi,
  settings:     settingsApi,
  integrations: integrationsApi,
};
