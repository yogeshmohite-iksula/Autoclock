import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite — dev on :5173, build to dist/, proxy /api → backend (:4000).
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
    outDir: 'dist',
    emptyOutDir: true,
  },
});
