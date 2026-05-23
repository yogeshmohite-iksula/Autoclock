// EP-12, EP-13 — preview the day + idempotent Close-My-Day sync.
// EP-13 is idempotent server-side (ADR-09, TB-13 external_writes ledger).

import { request } from './client';

export const dayApi = {
  /** EP-12 — preview. Response: { work_date, groups, total_minutes, warnings, errors } */
  preview: (workDate) =>
    request('/api/day/preview', { method: 'POST', body: { work_date: workDate } }),

  /** EP-13 — idempotent close. Always sends confirmed:true per FR-04. */
  close: (workDate) =>
    request('/api/day/close', { method: 'POST', body: { work_date: workDate, confirmed: true } }),
};
