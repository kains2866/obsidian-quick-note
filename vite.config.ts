import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

/**
 * Single source of truth for the extension version: package.json.
 * The manifest version is injected at build time so they never drift apart.
 */
const manifestWithVersion = { ...manifest, version: pkg.version };

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [crx({ manifest: manifestWithVersion })],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
