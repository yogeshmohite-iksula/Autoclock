import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite — dev on :5173, proxy /api → backend (:4000).
//
// Build output → ../backend/public/ (not web/dist/).
// Why: Hostinger's Node hosting deploys only the configured app root (backend/)
// to the runtime path. A sibling web/dist/ is built but never copied to the
// runtime directory, so Express can't find it (ENOENT on / requests).
// Per Passenger / Hostinger docs, static assets must live inside <app-root>.
// Writing the build output inside backend/ guarantees it ships with the
// backend deploy. backend/server.js serves from path.join(__dirname,'public').
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/public',
    // emptyOutDir is required when outDir is outside the project root —
    // it both suppresses the safety warning and opts in to clearing stale assets.
    emptyOutDir: true,
  },
});
