// client.js — fetch wrapper + mock dispatcher.
// All api/* methods go through `request()` here. Mocks live in mocks.js and
// dispatch from this file when VITE_USE_MOCKS is truthy (the dev default).
//
// Swapping from mocks → real backend is a one-line change: set the env var,
// rebuild. The shape of every response matches docs/Project Docs/AutoClock_ERD.md §6.

import * as mocks from './mocks';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

/**
 * Network fetch with credentials + JSON. Throws on !res.ok.
 * @param {string} path — e.g. "/api/projects"
 * @param {{ method?: string, body?: any, headers?: object }} [opts]
 */
async function networkRequest(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* some endpoints return empty */ }
  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/**
 * Single entry point used by every api/* module.
 * If USE_MOCKS, looks up a handler in mocks.dispatch(method, path, body).
 */
export async function request(path, opts = {}) {
  if (USE_MOCKS) {
    const handler = mocks.dispatch(opts.method || 'GET', path, opts.body);
    if (handler) return handler();
    // Fall through if no mock handler — surfaces "missing mock" instead of
    // silently hitting localhost during development.
    throw new Error(`No mock handler for ${opts.method || 'GET'} ${path}`);
  }
  return networkRequest(path, opts);
}
