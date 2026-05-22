// api.js — minimal fetch wrapper. Always sends cookies (sessions).
// Base URL: in dev, Vite proxies /api → backend; in prod, same-origin.

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* ignore — some endpoints return text */ }
  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export const api = {
  // EP-01
  login: (email) => request('/api/auth/login', { method: 'POST', body: { email } }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // EP-06 / EP-07
  projects: () => request('/api/projects'),
  tasksForProject: (projectId) => request(`/api/projects/${projectId}/tasks`),

  // EP-08..EP-11
  entries: (date) => request(`/api/entries?date=${encodeURIComponent(date)}`),
  createEntry: (entry) => request('/api/entries', { method: 'POST', body: entry }),
  updateEntry: (id, patch) => request(`/api/entries/${id}`, { method: 'PUT', body: patch }),
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: 'DELETE' }),

  // EP-12 / EP-13
  previewDay: (workDate) => request('/api/day/preview', { method: 'POST', body: { work_date: workDate } }),
  closeDay: (workDate) => request('/api/day/close', { method: 'POST', body: { work_date: workDate, confirmed: true } }),

  // EP-14
  dashboardTeam: () => request('/api/dashboard/team'),
};
