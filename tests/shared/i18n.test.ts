import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLanguage,
  t,
  localizePage,
  localizePlaceholders,
  messages,
} from '../../src/shared/i18n.js';

describe('i18n', () => {
  let originalLanguage: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language');
  });

  afterEach(() => {
    if (originalLanguage) {
      Object.defineProperty(window.navigator, 'language', originalLanguage);
    }
  });

  function setNavigatorLanguage(language: string) {
    Object.defineProperty(window.navigator, 'language', {
      value: language,
      configurable: true,
    });
  }

  it('detects Chinese browsers', () => {
    setNavigatorLanguage('zh-CN');
    expect(getLanguage()).toBe('zh-CN');
  });

  it('detects Taiwanese Chinese as zh-CN', () => {
    setNavigatorLanguage('zh-TW');
    expect(getLanguage()).toBe('zh-CN');
  });

  it('detects English browsers', () => {
    setNavigatorLanguage('en-US');
    expect(getLanguage()).toBe('en');
  });

  it('falls back to English for other languages', () => {
    setNavigatorLanguage('ja-JP');
    expect(getLanguage()).toBe('en');
  });

  it('returns Chinese text when language is zh-CN', () => {
    setNavigatorLanguage('zh-CN');
    expect(t('saveToObsidian')).toBe('保存到 Obsidian');
  });

  it('returns English text when language is en', () => {
    setNavigatorLanguage('en-US');
    expect(t('saveToObsidian')).toBe('Save to Obsidian');
  });

  it('falls back to key if missing in both languages', () => {
    setNavigatorLanguage('en-US');
    expect(t('totallyMissingKey')).toBe('totallyMissingKey');
  });

  it('replaces placeholders in localized strings', () => {
    setNavigatorLanguage('en-US');
    expect(t('currentShortcut', { shortcut: 'Ctrl+Shift+S' })).toBe(
      'Current shortcut: Ctrl+Shift+S',
    );
  });

  it('has matching keys in zh-CN and en message tables', () => {
    const zhKeys = Object.keys(messages['zh-CN']).sort();
    const enKeys = Object.keys(messages['en']).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('localizes elements with data-i18n attribute', () => {
    setNavigatorLanguage('en-US');
    document.body.innerHTML = '<button data-i18n="saveToObsidian">保存到 Obsidian</button>';
    localizePage();
    expect(document.querySelector('button')?.textContent).toBe('Save to Obsidian');
  });

  it('localizes placeholders for inputs and textareas', () => {
    setNavigatorLanguage('en-US');
    document.body.innerHTML = `
      <input data-i18n-placeholder="vaultNamePlaceholder" placeholder="例如：MyVault" />
      <textarea data-i18n-placeholder="enterMarkdown" placeholder="输入 Markdown…"></textarea>
    `;
    localizePlaceholders();
    expect(document.querySelector('input')?.placeholder).toBe('e.g. MyVault');
    expect(document.querySelector('textarea')?.placeholder).toBe('Enter Markdown…');
  });

  it('falls back to English when a key is missing in the current language', () => {
    setNavigatorLanguage('zh-CN');
    const originalZhMessages = messages['zh-CN'];
    const zhMessagesWithoutKey = { ...originalZhMessages };
    delete zhMessagesWithoutKey.saveToObsidian;
    messages['zh-CN'] = zhMessagesWithoutKey;

    try {
      expect(t('saveToObsidian')).toBe(messages['en'].saveToObsidian);
    } finally {
      messages['zh-CN'] = originalZhMessages;
    }
  });
});
