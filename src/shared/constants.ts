import type { ExtensionSettings, Draft } from './types.js';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiUrl: 'http://127.0.0.1:27123',
  apiKey: '',
  baseFolder: '速记',
  dateSubfolderTemplate: '{{YYYY}}/{{MM}}',
  includeFrontmatterTitle: true,
  includeFrontmatterDate: true,
  includeFrontmatterUrl: true,
  includeFrontmatterTags: true,
  defaultTags: ['quick-note'],
};

export const DEFAULT_DRAFT: Draft = {
  content: '',
  includeUrl: false,
  includeTitle: false,
  includeMedia: false,
  targetFolder: '',
  targetFilename: '',
};

export const STORAGE_KEYS = {
  settings: 'oqn:settings',
  draft: 'oqn:draft',
} as const;

export const MAX_FILENAME_LENGTH = 80;
