---
paths:
  - "web/src/**"
  - "extension/**"
---
# Frontend Rules

- Stack: React 18 + Vite + Chart.js + React Router v6. No global state library for M0 — lift to local component state and URL params first.
- All API calls go through `web/src/api.js` (sends cookies, throws on `!res.ok`). Do not call `fetch` directly from components.
- Accessibility (WCAG 2.1 AA basics — PRD §11):
  - Every form control has a `<label htmlFor>`.
  - Status never communicated by colour alone (use icon + text).
  - Visible focus state — do not remove the `outline`.
  - Use `role="alert"` / `aria-live` for sync result + error states.
- "Close My Day" is **two-step**: preview → confirm (FR-04). Never call EP-13 without `confirmed: true`.
- Extension (MV3):
  - Register the `chrome.alarms.onAlarm` listener at the **top level** of `background.js` (DevDoc §7).
  - Never use `setInterval` — the service worker sleeps.
  - Persist state in `chrome.storage.local`, never module globals.
  - Offline queue is M1 (ERD §14.6); for M0 show a clear "offline" state.
- Design tokens live in `web/src/assets/tokens.css`. Refine them from the `docs/AutoClock_Designs.html` mockup — do not invent new colours.
