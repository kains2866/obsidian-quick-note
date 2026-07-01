import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/constants.js';

type BackgroundModule = typeof import('../../src/background/background.js');

const mockFetch = vi.fn();
const mockDownload = vi.fn();

vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockDownload.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function loadBackground(): Promise<BackgroundModule> {
  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
    downloads: {
      download: mockDownload,
    },
  });
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.resetModules();
  return import('../../src/background/background.js');
}

function abortWhenSignalled(init: RequestInit | undefined): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (init?.signal?.aborted) {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      reject(err);
      return;
    }
    const onAbort = () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      reject(err);
    };
    init?.signal?.addEventListener('abort', onAbort);
  });
}

describe('background api', () => {
  it('saves note successfully', async () => {
    const { saveNoteToObsidian } = await loadBackground();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });
    const result = await saveNoteToObsidian(
      { path: 'test/note.md', content: 'hello' },
      DEFAULT_SETTINGS,
    );
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:27123/vault/test/note.md',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns error on 401', async () => {
    const { saveNoteToObsidian } = await loadBackground();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    const result = await saveNoteToObsidian(
      { path: 'test/note.md', content: 'hello' },
      DEFAULT_SETTINGS,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('tests connection', async () => {
    const { testConnection } = await loadBackground();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' });
    const ok = await testConnection(DEFAULT_SETTINGS);
    expect(ok).toBe(true);
  });

  it('downloads markdown file', async () => {
    const { downloadMarkdownFile } = await loadBackground();
    downloadMarkdownFile('note.md', '# Hello');
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'blob:mock-url',
        filename: 'note.md',
        saveAs: false,
      }),
      expect.any(Function),
    );
  });

  it('handles SAVE_NOTE message', async () => {
    await loadBackground();
    const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
    const listener = addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });

    const handled = listener(
      { type: 'SAVE_NOTE', payload: { path: 'test.md', content: 'hi' }, settings: DEFAULT_SETTINGS },
      {},
      sendResponse,
    );

    expect(handled).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('handles TEST_CONNECTION message', async () => {
    await loadBackground();
    const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
    const listener = addListener.mock.calls[0][0];
    const sendResponse = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' });

    const handled = listener(
      { type: 'TEST_CONNECTION', settings: DEFAULT_SETTINGS },
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

    const handled = listener(
      { type: 'DOWNLOAD_NOTE', filename: 'note.md', content: '# Hello' },
      {},
      sendResponse,
    );

    expect(handled).toBe(true);
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'note.md',
        saveAs: false,
      }),
      expect.any(Function),
    );
  });

  it('retries on 409 conflict with incremented filename suffix', async () => {
    const { saveNoteToObsidian } = await loadBackground();
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => 'file exists' })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });

    const result = await saveNoteToObsidian(
      { path: 'test/note.md', content: 'hello' },
      DEFAULT_SETTINGS,
    );

    expect(result.success).toBe(true);
    expect(result.path).toBe('test/note-1.md');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:27123/vault/test/note.md',
      expect.anything(),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:27123/vault/test/note-1.md',
      expect.anything(),
    );
  });

  it('gives up after 10 conflict retries', async () => {
    const { saveNoteToObsidian } = await loadBackground();
    for (let i = 0; i <= 10; i++) {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 409, text: async () => 'file exists' });
    }

    const result = await saveNoteToObsidian(
      { path: 'test/note.md', content: 'hello' },
      DEFAULT_SETTINGS,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('409');
    expect(mockFetch).toHaveBeenCalledTimes(11);
  });

  it('aborts fetch after 10 seconds and returns timeout error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockImplementation((_url, init) => abortWhenSignalled(init));

    const { saveNoteToObsidian } = await loadBackground();
    const promise = saveNoteToObsidian(
      { path: 'test/note.md', content: 'hello' },
      DEFAULT_SETTINGS,
    );

    vi.advanceTimersByTime(10001);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });
});
