import type { ExtensionSettings, Draft } from './types.js';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  vaultName: '',
  baseFolder: '速记',
  dateSubfolderTemplate: '{{YYYY}}/{{MM}}',
  dateFormat: 'date',
  includeSelectedText: true,
  preserveImagesInSelection: true,
  includeFrontmatterTitle: true,
  includeFrontmatterDate: true,
  includeFrontmatterUrl: true,
  includeFrontmatterTags: true,
  includeFrontmatterAuthor: false,
  includeFrontmatterDescription: false,
  includeFrontmatterSite: false,
  defaultTags: ['quick-note'],
};

export const DEFAULT_DRAFT: Draft = {
  content: '',
  includeUrl: false,
  includeTitle: true,
  targetFolder: '',
  targetFilename: '',
  frontmatterOverrides: {},
};

export const STORAGE_KEYS = {
  settings: 'oqn:settings',
  drafts: 'oqn:drafts',
} as const;

export const MAX_FILENAME_LENGTH = 80;
