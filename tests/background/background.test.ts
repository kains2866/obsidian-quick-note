import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDownload = vi.fn();
const mockTabsUpdate = vi.fn();
const mockTabsQuery = vi.fn();
const mockStorageSet = vi.fn();
const mockStorageGet = vi.fn();
const mockStorageRemove = vi.fn();
const mockTabsOnRemovedAddListener = vi.fn();
const mockTabsOnUpdatedAddListener = vi.fn();

beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
  mockDownload.mockReset();
  mockTabsUpdate.mockReset();
  mockTabsQuery.mockReset();
  mockStorageSet.mockReset();
  mockStorageGet.mockReset();
  mockStorageRemove.mockReset();
  mockTabsOnRemovedAddListener.mockReset();
  mockTabsOnUpdatedAddListener.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loadBackground(initialStorage: Record<string, unknown> = {}) {
  vi.stubGlobal('chrome', {
    runtime: {
      onInstalled: {
        addListener: vi.fn(),
      },
      onMessage: {
        addListener: vi.fn(),
      },
      getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
      lastError: undefined,
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: {
        addListener: vi.fn(),
      },
    },
    action: {
      openPopup: vi.fn(),
    },
    windows: {
      create: vi.fn(),
    },
    downloads: {
      download: mockDownload,
    },
    tabs: {
      update: mockTabsUpdate,
      query: mockTabsQuery,
      onRemoved: {
        addListener: mockTabsOnRemovedAddListener,
      },
      onUpdated: {
        addListener: mockTabsOnUpdatedAddListener,
      },
    },
    storage: {
      local: {
        get: mockStorageGet.mockImplementation((keys: string[]) => {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => { result[key] = initialStorage[key]; });
          return Promise.resolve(result);
        }),
        set: mockStorageSet.mockImplementation(() => Promise.resolve()),
        remove: mockStorageRemove.mockImplementation(() => Promise.resolve()),
      },
    },
  });
  vi.resetModules();
  return import('../../src/background/background.js');
}

describe('background', () => {
  it('downloads markdown file', async () => {
    const { downloadMarkdownFile } = await loadBackground();
    mockDownload.mockImplementation((_options, callback) => callback?.(42));
    const downloadId = await downloadMarkdownFile('note.md', '# Hello');
    expect(downloadId).toBe(42);
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/^data:text\/markdown/),
        filename: 'note.md',
        saveAs: false,
      }),
      expect.any(Function),
    );
  });

  it('opens Obsidian URL in current tab', async () => {
    const { openObsidianUrl } = await loadBackground();
    mockTabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com' }]);
    mockTabsUpdate.mockResolvedValue({});

    await openObsidianUrl('obsidian://new?file=note');

    expect(mockTabsUpdate).toHaveBeenCalledWith(7, { url: 'obsidian://new?file=note' });
  });

  it('throws when no active tab is found', async () => {
    const { openObsidianUrl } = await loadBackground();
    mockTabsQuery.mockResolvedValue([]);

    await expect(openObsidianUrl('obsidian://new?file=note')).rejects.toThrow('Cannot get current tab');
  });

  it('handles OPEN_OBSIDIAN_URL message', async () => {
    await loadBackground();
    const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
    const listener = addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    mockTabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com' }]);
    mockTabsUpdate.mockResolvedValue({});

    const handled = listener(
      { type: 'OPEN_OBSIDIAN_URL', url: 'obsidian://new?file=note' },
      {},
      sendResponse,
    );

    expect(handled).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('handles DOWNLOAD_NOTE message', async () => {
    await loadBackground();
    const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
    const listener = addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    mockDownload.mockImplementation((_options, callback) => callback?.(42));

    const handled = listener(
      { type: 'DOWNLOAD_NOTE', filename: 'note.md', content: '# Hello' },
      {},
      sendResponse,
    );

    expect(handled).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('returns error when DOWNLOAD_NOTE download fails', async () => {
    await loadBackground();
    const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
    const listener = addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    mockDownload.mockImplementation((_options, _callback) => {
      (chrome.runtime as unknown as { lastError?: { message: string } }).lastError = {
        message: 'Download failed',
      };
      if (_callback) _callback(undefined as unknown as number);
      (chrome.runtime as unknown as { lastError?: { message: string } }).lastError = undefined;
    });

    const handled = listener(
      { type: 'DOWNLOAD_NOTE', filename: 'note.md', content: '# Hello' },
      {},
      sendResponse,
    );

    expect(handled).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'Download failed' });
  });

  it('registers tabs.onRemoved listener to clean up draft', async () => {
    await loadBackground();
    expect(mockTabsOnRemovedAddListener).toHaveBeenCalled();
    expect(mockTabsOnUpdatedAddListener).toHaveBeenCalled();
  });

  it('removes draft when tab is closed', async () => {
    const initialStorage = {
      'oqn:drafts': { 1: { content: 'tab 1' }, 2: { content: 'tab 2' } },
    };
    await loadBackground(initialStorage);

    const removedListener = mockTabsOnRemovedAddListener.mock.calls[0][0];
    await removedListener(1);

    expect(mockStorageSet).toHaveBeenCalledWith({ 'oqn:drafts': { 2: { content: 'tab 2' } } });
  });

  it('removes draft when tab starts loading an http page', async () => {
    const initialStorage = {
      'oqn:drafts': { 1: { content: 'tab 1' }, 2: { content: 'tab 2' } },
    };
    await loadBackground(initialStorage);

    const updatedListener = mockTabsOnUpdatedAddListener.mock.calls[0][0];
    await updatedListener(1, { status: 'loading' }, { url: 'https://example.com' });

    expect(mockStorageSet).toHaveBeenCalledWith({ 'oqn:drafts': { 2: { content: 'tab 2' } } });
  });

  it('does not remove draft when tab loads a non-http url', async () => {
    const initialStorage = {
      'oqn:drafts': { 1: { content: 'tab 1' } },
    };
    await loadBackground(initialStorage);

    const updatedListener = mockTabsOnUpdatedAddListener.mock.calls[0][0];
    await updatedListener(1, { status: 'loading' }, { url: 'chrome-extension://mock/page.html' });

    expect(mockStorageSet).not.toHaveBeenCalled();
  });
});
