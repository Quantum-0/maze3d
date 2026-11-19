import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_URL || '/',
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  build: {
    target: 'esnext',
  },
});
