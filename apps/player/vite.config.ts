import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves each app from /The-Footballers-Mind/<app>/
// Local dev (pnpm dev) uses base='/' — controlled via BASE env var.
const base = process.env.GH_PAGES ? '/The-Footballers-Mind/player/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, host: true },
});
