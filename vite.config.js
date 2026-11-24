import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Forward API + receipt + telegram to local wrangler dev (port 8787)
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/pay': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/telegram': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
