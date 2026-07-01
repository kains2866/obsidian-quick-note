import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_DRAFT, STORAGE_KEYS } from '../../src/shared/constants.js';
import type { ExtensionSettings, Draft, PageInfo, MediaInfo } from '../../src/shared/types.js';

type PopupModule = typeof import('../../src/popup/popup.js');

const POPUP_HTML = `
  <div class="popup">
    <div class="target-path" id="target-path">保存到：...</div>
    <div class="target-edit" id="target-edit">
      <label>文件夹 <input type="text" id="target-folder-input" placeholder="覆盖文件夹" /></label>
      <label>文件名 <input type="text" id="target-filename-input" placeholder="覆盖文件名" /></label>
      <div class="target-edit-actions">
        <button id="target-edit-save" type="button">保存</button>
        <button id="target-edit-cancel" type="button">取消</button>
      </div>
    </div>
    <div class="toggles">
      <label><input type="checkbox" id="toggle-url" /> URL</label>
      <label><input type="checkbox" id="toggle-title" /> 标题</label>
      <label><input type="checkbox" id="toggle-media" /> 播放内容</label>
    </div>
    <textarea id="editor" placeholder="输入 Markdown..."></textarea>
    <div class="footer">
      <span id="char-count">0 字符</span>
      <button id="save-btn">保存到 Obsidian</button>
      <a href="../options/options.html" target="_blank" id="open-options">设置</a>
    </div>
    <div id="status"></div>
  </div>
`;

const FIXED_DATE = new Date('2026-07-15T12:00:00Z');

const page: PageInfo = {
  url: 'https://example.com/path?x=1',
  title: 'Example Page',
  selectedText: 'selected text',
};

const media: MediaInfo = {
  url: 'https://example.com/video',
  title: 'Cool Video',
  currentTime: '03:24',
};

function renderPopup(): void {
  document.body.innerHTML = POPUP_HTML;
}

function chromeMock(overrides: {
  storedSettings?: ExtensionSettings;
  storedDraft?: Draft;
  pageInfo?: PageInfo;
  mediaInfo?: MediaInfo;
  sendMessage?: Mock;
} = {}) {
  const mockStorage: Record<string, unknown> = {};
  if (overrides.storedSettings !== undefined) {
    mockStorage[STORAGE_KEYS.settings] = overrides.storedSettings;
  }
  if (overrides.storedDraft !== undefined) {
    mockStorage[STORAGE_KEYS.draft] = overrides.storedDraft;
  }

  const runtimeSendMessage =
    overrides.sendMessage ??
    vi.fn((_message: unknown) => Promise.resolve({ success: true }));

  return {
    storage: {
      local: {
        get: vi.fn((keys: string[]) => {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => {
            result[key] = mockStorage[key];
          });
          return Promise.resolve(result);
        }),
        set: vi.fn((_items: Record<string, unknown>) => Promise.resolve()),
        remove: vi.fn((_key: string) => Promise.resolve()),
      },
    },
    tabs: {
      query: vi.fn(() =>
        Promise.resolve([{ id: 1, url: page.url, title: page.title }]),
      ),
      sendMessage: vi.fn((_tabId: number, message: { type: string }) => {
        if (message.type === 'GET_PAGE_INFO') {
          return Promise.resolve(overrides.pageInfo ?? page);
        }
        if (message.type === 'GET_MEDIA_INFO') {
          return Promise.resolve(overrides.mediaInfo ?? media);
        }
        return Promise.resolve({});
      }),
    },
    runtime: {
      sendMessage: runtimeSendMessage,
    },
    downloads: {
      download: vi.fn((_options: unknown) => Promise.resolve(1)),
    },
  };
}

async function loadPopup(overrides: {
  storedSettings?: ExtensionSettings;
  storedDraft?: Draft;
  pageInfo?: PageInfo;
  mediaInfo?: MediaInfo;
  sendMessage?: Mock;
} = {}): Promise<PopupModule> {
  renderPopup();
  vi.stubGlobal('chrome', chromeMock(overrides));
  vi.resetModules();
  return import('../../src/popup/popup.js');
}

describe('popup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  describe('init flow', () => {
    it('loads draft values into the editor and toggles', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'draft content',
        includeUrl: true,
        includeTitle: true,
        includeMedia: true,
      };
      const { init } = await loadPopup({ storedDraft });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'draft content',
      );
      expect((document.getElementById('toggle-url') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('toggle-title') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('toggle-media') as HTMLInputElement).checked).toBe(true);
    });

    it('falls back to tab info when content script messages fail', async () => {
      const { init } = await loadPopup({
        storedDraft: DEFAULT_DRAFT,
        pageInfo: undefined,
        mediaInfo: undefined,
      });
      (chrome.tabs.sendMessage as Mock).mockRejectedValue(new Error('no content script'));
      await init();

      const targetPath = document.getElementById('target-path') as HTMLDivElement;
      expect(targetPath.textContent).toContain('保存到：');
    });
  });

  describe('getCurrentDraft', () => {
    it('returns a draft matching the current UI state', async () => {
      const { init, getCurrentDraft } = await loadPopup();
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'note body';
      (document.getElementById('toggle-url') as HTMLInputElement).checked = true;
      (document.getElementById('toggle-title') as HTMLInputElement).checked = false;
      (document.getElementById('toggle-media') as HTMLInputElement).checked = true;

      const current = getCurrentDraft();
      expect(current.content).toBe('note body');
      expect(current.includeUrl).toBe(true);
      expect(current.includeTitle).toBe(false);
      expect(current.includeMedia).toBe(true);
      expect(current.targetFolder).toBe('');
    });
  });

  describe('updateCharCount', () => {
    it('reflects the editor length', async () => {
      const { init, updateCharCount } = await loadPopup();
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = '12345';
      updateCharCount();

      expect(document.getElementById('char-count')?.textContent).toBe('5 字符');
    });
  });

  describe('updateTargetPath', () => {
    it('shows the resolved path using settings base folder and date template', async () => {
      const { init, updateTargetPath } = await loadPopup();
      await init();

      updateTargetPath();

      const targetPath = document.getElementById('target-path') as HTMLDivElement;
      expect(targetPath.textContent).toMatch(
        /保存到：速记\/2026\/07\/\d{8}-\d{6}\.md$/,
      );
    });

    it('uses page title in path when title toggle is checked', async () => {
      const { init, updateTargetPath } = await loadPopup();
      await init();

      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;
      updateTargetPath();

      expect(document.getElementById('target-path')?.textContent).toBe(
        '保存到：速记/2026/07/Example Page.md',
      );
    });
  });

  describe('saveDraft', () => {
    it('persists the current draft to storage', async () => {
      const { init, saveDraft } = await loadPopup();
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'persist me';
      (document.getElementById('toggle-url') as HTMLInputElement).checked = true;

      await saveDraft();

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      const call = (chrome.storage.local.set as Mock).mock.calls[0][0] as Record<string, Draft>;
      expect(call[STORAGE_KEYS.draft].content).toBe('persist me');
      expect(call[STORAGE_KEYS.draft].includeUrl).toBe(true);
    });
  });

  describe('handleSave', () => {
    it('sends SAVE_NOTE with the computed path, content, and settings', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'SAVE_NOTE') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({ sendMessage });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'my note';
      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;

      await handleSave();

      const saveCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'SAVE_NOTE',
      );
      expect(saveCall).toBeDefined();
      const saveMessage = saveCall![0] as unknown as { payload: { path: string; content: string } };
      const payload = saveMessage.payload;
      expect(payload.path).toBe('速记/2026/07/Example Page.md');
      expect(payload.content).toContain('# Example Page');
      expect(payload.content).toContain('my note');
    });

    it('clears the editor and shows success after a successful save', async () => {
      const sendMessage = vi.fn((_message: unknown) =>
        Promise.resolve({ success: true }),
      );
      const { init, handleSave } = await loadPopup({ sendMessage });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'saved note';
      await handleSave();

      expect(editor.value).toBe('');
      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe('已保存');
      expect(status.className).toBe('success');
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.draft);
    });

    it('shows an error and triggers DOWNLOAD_NOTE fallback on failure', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'SAVE_NOTE') {
          return Promise.resolve({ success: false, error: 'API unreachable' });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({ sendMessage });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'failed note';
      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe('保存失败：API unreachable，已下载兜底文件');
      expect(status.className).toBe('error');

      const downloadCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'DOWNLOAD_NOTE',
      );
      expect(downloadCall).toBeDefined();
      const downloadMessage = downloadCall![0] as unknown as {
        filename: string;
        content: string;
      };
      expect(downloadMessage.filename).toBe('Example Page.md');
      expect(downloadMessage.content).toContain('failed note');
    });

    it('triggers DOWNLOAD_NOTE fallback when sendMessage throws', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'SAVE_NOTE') {
          return Promise.reject(new Error('service worker unavailable'));
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({ sendMessage });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'crashed note';
      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe('保存失败：service worker unavailable，已下载兜底文件');
      expect(status.className).toBe('error');

      const downloadCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'DOWNLOAD_NOTE',
      );
      expect(downloadCall).toBeDefined();
    });
  });

  describe('target path override', () => {
    it('opens edit form with current computed folder and filename', async () => {
      const { init, openTargetEdit } = await loadPopup();
      await init();

      openTargetEdit();

      expect(
        (document.getElementById('target-folder-input') as HTMLInputElement).value,
      ).toMatch(/速记\/2026\/07/);
      expect(
        (document.getElementById('target-filename-input') as HTMLInputElement).value,
      ).toMatch(/^\d{8}-\d{6}$/);
      expect(document.getElementById('target-edit')?.classList.contains('visible')).toBe(true);
    });

    it('saves folder and filename overrides to draft and updates path', async () => {
      const { init, openTargetEdit, saveTargetEdit, updateTargetPath } = await loadPopup();
      await init();

      openTargetEdit();
      (document.getElementById('target-folder-input') as HTMLInputElement).value =
        'custom/folder';
      (document.getElementById('target-filename-input') as HTMLInputElement).value =
        'custom-file';
      await saveTargetEdit();

      expect(document.getElementById('target-edit')?.classList.contains('visible')).toBe(false);
      expect(chrome.storage.local.set).toHaveBeenCalled();
      const call = (chrome.storage.local.set as Mock).mock.calls[0][0] as Record<string, Draft>;
      expect(call[STORAGE_KEYS.draft].targetFolder).toBe('custom/folder');
      expect(call[STORAGE_KEYS.draft].targetFilename).toBe('custom-file');

      updateTargetPath();
      expect(document.getElementById('target-path')?.textContent).toBe(
        '保存到：custom/folder/custom-file.md',
      );
    });

    it('uses overrides in handleSave path and content', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'SAVE_NOTE') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, openTargetEdit, saveTargetEdit, handleSave } = await loadPopup({
        sendMessage,
      });
      await init();

      openTargetEdit();
      (document.getElementById('target-folder-input') as HTMLInputElement).value =
        'override/folder';
      (document.getElementById('target-filename-input') as HTMLInputElement).value =
        'override-file';
      await saveTargetEdit();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'override note';
      await handleSave();

      const saveCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'SAVE_NOTE',
      );
      expect(saveCall).toBeDefined();
      const saveMessage = saveCall![0] as unknown as {
        payload: { path: string; content: string };
      };
      expect(saveMessage.payload.path).toBe('override/folder/override-file.md');
      expect(saveMessage.payload.content).toContain('title: "override-file"');
    });
  });

  describe('event listeners', () => {
    it('updates char count and saves draft on editor input', async () => {
      const { init } = await loadPopup();
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'typed';
      editor.dispatchEvent(new Event('input', { bubbles: true }));

      await vi.waitFor(() =>
        expect(document.getElementById('char-count')?.textContent).toBe('5 字符'),
      );
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('updates target path and saves draft on toggle change', async () => {
      const { init } = await loadPopup();
      await init();

      const toggleTitle = document.getElementById('toggle-title') as HTMLInputElement;
      toggleTitle.checked = true;
      toggleTitle.dispatchEvent(new Event('change', { bubbles: true }));

      await vi.waitFor(() =>
        expect(document.getElementById('target-path')?.textContent).toContain(
          'Example Page.md',
        ),
      );
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('calls handleSave when save button is clicked', async () => {
      const sendMessage = vi.fn((_message: unknown) =>
        Promise.resolve({ success: true }),
      );
      await loadPopup({ sendMessage });

      const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
      saveBtn.click();

      await vi.waitFor(() => expect(sendMessage).toHaveBeenCalled());
      const call = sendMessage.mock.calls[0][0] as { type: string };
      expect(call.type).toBe('SAVE_NOTE');
    });
  });
});
