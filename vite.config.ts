import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [crx({ manifest })],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
