# Stack
- Node 18+ (CommonJS in backend; ES modules in web).
- Express 4.x — keep middleware order: cookie-parser → json → session → routes → error handler.
- Vite 5 — proxies `/api` → backend in dev.
- Chrome MV3 — service worker sleeps; top-level alarm listeners only.
- Package manager: npm (lockfiles committed; never `npm install -g` in CI).
