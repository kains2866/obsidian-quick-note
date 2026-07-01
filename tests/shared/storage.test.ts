import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, setSettings, getDraft, setDraft, clearDraft } from '../../src/shared/storage.js';
import { DEFAULT_SETTINGS, DEFAULT_DRAFT, STORAGE_KEYS } from '../../src/shared/constants.js';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => { result[key] = mockStorage[key]; });
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
});

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

describe('storage', () => {
  it('returns default settings when none stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and retrieves settings', async () => {
    const updated = { ...DEFAULT_SETTINGS, baseFolder: '测试' };
    await setSettings(updated);
    const stored = await getSettings();
    expect(stored.baseFolder).toBe('测试');
  });

  it('returns default draft when none stored', async () => {
    const draft = await getDraft();
    expect(draft).toEqual(DEFAULT_DRAFT);
  });

  it('saves and retrieves draft', async () => {
    await setDraft({ ...DEFAULT_DRAFT, content: 'hello' });
    const draft = await getDraft();
    expect(draft.content).toBe('hello');
  });

  it('clears draft', async () => {
    await setDraft({ ...DEFAULT_DRAFT, content: 'hello' });
    await clearDraft();
    const draft = await getDraft();
    expect(draft).toEqual(DEFAULT_DRAFT);
  });
});
