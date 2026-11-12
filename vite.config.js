import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps every asset path relative, so dist/ works on any host or sub-folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  optimizeDeps: { entries: ['index.html'] }, // artifact.html is only for the Claude preview link

  build: { chunkSizeWarningLimit: 1200 },
});
