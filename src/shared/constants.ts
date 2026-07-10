import type { ExtensionSettings, Draft } from './types.js';

// Single source of truth for branding / metadata that appears in multiple
// places (manifest, context menu, popup title, options footer, i18n).
export const EXTENSION_NAME = 'Obsidian Quick Note';
export const AUTHOR_NAME = 'kains';
export const AUTHOR_EMAIL = 'kains3772@gmail.com';
export const GITHUB_REPO_URL = 'https://github.com/kains2866/obsidian-quick-note';
export const DEFAULT_TAG = 'quick-note';
export const CONTEXT_MENU_ITEM_ID = 'open-obsidian-quick-note';
export const OPEN_POPUP_COMMAND_DESCRIPTION = `Open ${EXTENSION_NAME} popup`;

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
  defaultTags: [DEFAULT_TAG],
  autoSelectFirstTag: true,
  domainTagRules: [],
  captureVideoProgress: true,
  theme: 'auto',
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
