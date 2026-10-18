/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function mswWorkerPlugin(): Plugin {
  return {
    name: 'msw-worker-serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/mockServiceWorker.js')) {
          const workerPath = path.resolve(__dirname, 'node_modules/msw/lib/mockServiceWorker.js');
          if (fs.existsSync(workerPath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(fs.readFileSync(workerPath, 'utf-8'));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mswWorkerPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.VITE_USE_MOCKS': JSON.stringify(
      process.env.VITE_USE_MOCKS ?? 'false',
    ),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: true,
  },
});
