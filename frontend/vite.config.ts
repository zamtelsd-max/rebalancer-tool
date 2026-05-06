import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/rebalancer-tool/',
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 5175 },
});
