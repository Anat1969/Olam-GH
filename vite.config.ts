import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel and local preview serve from '/'. The GitHub build (build:github) passes --base=./ for app/.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { target: 'es2020', chunkSizeWarningLimit: 600 },
});
