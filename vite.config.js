import { defineConfig } from 'vite';

// Relative base so the same dist works on Vercel (site root) and
// GitHub Pages (https://<owner>.github.io/my-internet-cafe/).
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    watch: { ignored: ['**/*.mp3'] }
  },
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
