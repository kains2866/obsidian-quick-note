import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  EXTENSION_NAME,
  AUTHOR_NAME,
  AUTHOR_EMAIL,
  GITHUB_REPO_URL,
  DEFAULT_TAG,
  CONTEXT_MENU_ITEM_ID,
  OPEN_POPUP_COMMAND_DESCRIPTION,
} from '../../src/shared/constants.js';

describe('DEFAULT_SETTINGS', () => {
  it('has captureVideoProgress enabled by default', () => {
    expect(DEFAULT_SETTINGS.captureVideoProgress).toBe(true);
  });

  it('uses DEFAULT_TAG as the first default tag', () => {
    expect(DEFAULT_SETTINGS.defaultTags).toEqual([DEFAULT_TAG]);
  });

  it('has autoSelectFirstTag enabled by default', () => {
    expect(DEFAULT_SETTINGS.autoSelectFirstTag).toBe(true);
  });

  it('has empty domainTagRules by default', () => {
    expect(DEFAULT_SETTINGS.domainTagRules).toEqual([]);
  });

  it('has theme set to auto by default', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('auto');
  });
});

describe('branding constants', () => {
  it('has consistent extension metadata', () => {
    expect(EXTENSION_NAME).toBe('Obsidian Quick Note');
    expect(AUTHOR_NAME).toBe('kains');
    expect(AUTHOR_EMAIL).toBe('kains3772@gmail.com');
    expect(GITHUB_REPO_URL).toBe('https://github.com/kains2866/obsidian-quick-note');
    expect(DEFAULT_TAG).toBe('quick-note');
    expect(CONTEXT_MENU_ITEM_ID).toBe('open-obsidian-quick-note');
    expect(OPEN_POPUP_COMMAND_DESCRIPTION).toBe(`Open ${EXTENSION_NAME} popup`);
  });
});
