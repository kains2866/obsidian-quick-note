import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };
import {
  EXTENSION_NAME,
  OPEN_POPUP_COMMAND_DESCRIPTION,
} from './src/shared/constants.js';

/**
 * Single source of truth for extension metadata:
 * - version comes from package.json
 * - name and command description come from shared/constants.ts
 * They are injected at build time so they never drift apart.
 */
const manifestWithVersion = {
  ...manifest,
  name: EXTENSION_NAME,
  version: pkg.version,
  commands: {
    ...manifest.commands,
    _execute_action: {
      ...manifest.commands._execute_action,
      description: OPEN_POPUP_COMMAND_DESCRIPTION,
    },
  },
};

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
