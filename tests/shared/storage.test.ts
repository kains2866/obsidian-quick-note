import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSettings,
  setSettings,
  getDraft,
  setDraft,
  clearDraft,
  removeDraft,
  getAllDrafts,
} from '../../src/shared/storage.js';
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
    const draft = await getDraft(1);
    expect(draft).toEqual({ ...DEFAULT_DRAFT, frontmatterOverrides: {} });
  });

  it('saves and retrieves draft by tabId', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'hello' });
    const draft = await getDraft(1);
    expect(draft.content).toBe('hello');
  });

  it('isolates drafts between tabIds', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'tab 1' });
    await setDraft(2, { ...DEFAULT_DRAFT, content: 'tab 2' });

    const draft1 = await getDraft(1);
    const draft2 = await getDraft(2);

    expect(draft1.content).toBe('tab 1');
    expect(draft2.content).toBe('tab 2');
  });

  it('clears draft for a specific tabId', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'hello' });
    await setDraft(2, { ...DEFAULT_DRAFT, content: 'world' });
    await clearDraft(1);

    const draft1 = await getDraft(1);
    const draft2 = await getDraft(2);

    expect(draft1).toEqual(DEFAULT_DRAFT);
    expect(draft2.content).toBe('world');
  });

  it('removeDraft is an alias for clearDraft', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'hello' });
    await removeDraft(1);
    const draft = await getDraft(1);
    expect(draft).toEqual(DEFAULT_DRAFT);
  });

  it('returns all drafts', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'a' });
    await setDraft(2, { ...DEFAULT_DRAFT, content: 'b' });
    const drafts = await getAllDrafts();
    expect(drafts[1].content).toBe('a');
    expect(drafts[2].content).toBe('b');
  });

  it('creates drafts object when setting the first draft', async () => {
    const draft = await getDraft(1);
    expect(draft).toEqual(DEFAULT_DRAFT);

    await setDraft(1, { ...DEFAULT_DRAFT, content: 'first' });
    const drafts = await getAllDrafts();
    expect(drafts[1].content).toBe('first');
  });

  it('uses immutable updates when setting a draft', async () => {
    await setDraft(1, { ...DEFAULT_DRAFT, content: 'first' });
    const firstSnapshot = await getAllDrafts();
    await setDraft(2, { ...DEFAULT_DRAFT, content: 'second' });
    const secondSnapshot = await getAllDrafts();

    expect(firstSnapshot[1].content).toBe('first');
    expect(secondSnapshot[1].content).toBe('first');
    expect(secondSnapshot[2].content).toBe('second');
  });
});
