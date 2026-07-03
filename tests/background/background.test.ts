import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDownload = vi.fn();
const mockTabsUpdate = vi.fn();
const mockTabsQuery = vi.fn();

beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
  mockDownload.mockReset();
  mockTabsUpdate.mockReset();
  mockTabsQuery.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loadBackground() {
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
});
