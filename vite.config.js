import { defineConfig } from 'vite';

// Project site: https://<owner>.github.io/my-internet-cafe/
// Dev keeps base "./" so local-play.bat can stay on http://localhost:5173/.
const pagesBase = '/my-internet-cafe/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? pagesBase : './',
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
}));
