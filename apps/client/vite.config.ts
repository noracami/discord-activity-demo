import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

// Read version from root package.json
const rootPkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
const clientVersion = rootPkg.version;

export default defineConfig({
  plugins: [vue()],
  define: {
    __CLIENT_VERSION__: JSON.stringify(clientVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared/types': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
