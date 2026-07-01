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
import { formatFrontmatterDate } from '../../src/shared/templates.js';
import { t } from '../../src/shared/i18n.js';
import type { ExtensionSettings, Draft, PageInfo } from '../../src/shared/types.js';

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
    </div>
    <div class="frontmatter-section" id="frontmatter-section">
      <div class="frontmatter-header" id="frontmatter-header">
        <span>Frontmatter</span>
        <span class="frontmatter-summary" id="frontmatter-summary">...</span>
      </div>
      <div class="frontmatter-body" id="frontmatter-body">
        <label><input type="checkbox" id="fm-title" /> title <span class="fm-value" id="fm-title-value"></span></label>
        <label><input type="checkbox" id="fm-date" /> date <span class="fm-value" id="fm-date-value"></span></label>
        <label><input type="checkbox" id="fm-url" /> url <span class="fm-value" id="fm-url-value"></span></label>
        <label><input type="checkbox" id="fm-author" /> author <span class="fm-value" id="fm-author-value"></span></label>
        <label><input type="checkbox" id="fm-description" /> description <span class="fm-value" id="fm-description-value"></span></label>
        <label><input type="checkbox" id="fm-site" /> site <span class="fm-value" id="fm-site-value"></span></label>
        <label><input type="checkbox" id="fm-tags" /> tags <span class="fm-value" id="fm-tags-value"></span></label>
      </div>
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
  selectedText: '',
  author: '',
  description: '',
  site: '',
};

const SETTINGS_WITH_VAULT: ExtensionSettings = {
  ...DEFAULT_SETTINGS,
  vaultName: 'MyVault',
};

function renderPopup(): void {
  document.body.innerHTML = POPUP_HTML;
}

function chromeMock(overrides: {
  storedSettings?: ExtensionSettings;
  storedDraft?: Draft;
  pageInfo?: PageInfo;
  sendMessage?: Mock;
  tabsSendMessage?: Mock;
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
    vi.fn((message: { type: string }) => {
      if (message.type === 'OPEN_OBSIDIAN_URL') {
        return Promise.resolve({ ok: true });
      }
      if (message.type === 'DOWNLOAD_NOTE') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true });
    });

  const tabsSendMessage =
    overrides.tabsSendMessage ??
    vi.fn((_tabId: number, message: { type: string }) => {
      if (message.type === 'GET_PAGE_INFO') {
        return Promise.resolve(overrides.pageInfo ?? page);
      }
      if (message.type === 'COPY_TO_CLIPBOARD') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    });

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
      query: vi.fn((_query) =>
        Promise.resolve([{ id: 1, url: page.url, title: page.title }]),
      ),
      sendMessage: tabsSendMessage,
      update: vi.fn(() => Promise.resolve({})),
      create: vi.fn(() => Promise.resolve({ id: 2 })),
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
  sendMessage?: Mock;
  tabsSendMessage?: Mock;
} = {}): Promise<PopupModule> {
  renderPopup();
  vi.stubGlobal('chrome', chromeMock(overrides));
  vi.resetModules();
  return import('../../src/popup/popup.js');
}

describe('popup', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  describe('buildObsidianUrl', () => {
    it('builds clipboard URL when useClipboard is true', async () => {
      const { buildObsidianUrl } = await loadPopup();
      const url = buildObsidianUrl('MyVault', 'folder/note', true, 'body');
      expect(url).toContain('obsidian://new?');
      expect(url).toContain('file=' + encodeURIComponent('folder/note'));
      expect(url).toContain('vault=MyVault');
      expect(url).toContain('clipboard');
      expect(url).not.toContain('content=');
    });

    it('builds content URL when useClipboard is false', async () => {
      const { buildObsidianUrl } = await loadPopup();
      const url = buildObsidianUrl('MyVault', 'folder/note', false, 'body');
      expect(url).toContain('content=' + encodeURIComponent('body'));
      expect(url).not.toContain('clipboard');
    });
  });

  describe('init flow', () => {
    it('loads draft values into the editor and toggles', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'draft content',
        includeUrl: true,
        includeTitle: true,
      };
      const { init } = await loadPopup({ storedDraft });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'draft content',
      );
      expect((document.getElementById('toggle-title') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('toggle-url') as HTMLInputElement).checked).toBe(false);
    });

    it('falls back to tab info when content script messages fail', async () => {
      const { init } = await loadPopup({
        storedDraft: DEFAULT_DRAFT,
        pageInfo: undefined,
      });
      (chrome.tabs.sendMessage as Mock).mockRejectedValue(new Error('no content script'));
      await init();

      const targetPath = document.getElementById('target-path') as HTMLDivElement;
      expect(targetPath.textContent).toContain(t('saveToPrefix'));
    });

    it('prefills editor with selected text when draft content is empty', async () => {
      const { init } = await loadPopup({
        storedDraft: DEFAULT_DRAFT,
        pageInfo: { ...page, selectedText: 'highlighted passage' },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'highlighted passage',
      );
    });

    it('does not prefill selected text when setting is disabled', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, includeSelectedText: false },
        storedDraft: DEFAULT_DRAFT,
        pageInfo: { ...page, selectedText: 'highlighted passage' },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('handleSave', () => {
    it('shows an error when vault name is not configured', async () => {
      const { init, handleSave } = await loadPopup({
        storedSettings: DEFAULT_SETTINGS,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'my note';
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('pleaseSetVaultName'));
      expect(status.className).toBe('error');
    });

    it('confirms before saving an empty note and aborts when cancelled', async () => {
      const sendMessage = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = '';
      await handleSave();

      expect(confirmSpy).toHaveBeenCalledWith(t('confirmSaveEmptyNote'));
      expect(sendMessage).not.toHaveBeenCalled();
      expect(document.getElementById('status')?.textContent).toBe(t('saveCancelled'));
      confirmSpy.mockRestore();
    });

    it('uses clipboard and opens Obsidian URL on successful save', async () => {
      const tabsSendMessage = vi.fn((_tabId: number, message: { type: string }) => {
        if (message.type === 'GET_PAGE_INFO') {
          return Promise.resolve(page);
        }
        if (message.type === 'COPY_TO_CLIPBOARD') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({});
      });
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
        tabsSendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'my note';
      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;

      await handleSave();

      const copyCall = tabsSendMessage.mock.calls.find(
        (call) => (call[1] as { type: string }).type === 'COPY_TO_CLIPBOARD',
      );
      expect(copyCall).toBeDefined();
      expect((copyCall![1] as unknown as { text: string }).text).toContain('my note');

      const openCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'OPEN_OBSIDIAN_URL',
      );
      expect(openCall).toBeDefined();
      const openMessage = openCall![0] as unknown as { url: string };
      expect(openMessage.url).toContain('clipboard');
      expect(openMessage.url).toContain('vault=MyVault');

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('savedToObsidian'));
      expect(status.className).toBe('success');
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.draft);
    });

    it('falls back to content in URL when clipboard fails', async () => {
      const tabsSendMessage = vi.fn((_tabId: number, message: { type: string }) => {
        if (message.type === 'GET_PAGE_INFO') {
          return Promise.resolve(page);
        }
        if (message.type === 'COPY_TO_CLIPBOARD') {
          return Promise.resolve({ success: false });
        }
        return Promise.resolve({});
      });
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
        tabsSendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'fallback note';
      await handleSave();

      const openCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'OPEN_OBSIDIAN_URL',
      );
      expect(openCall).toBeDefined();
      const openMessage = openCall![0] as unknown as { url: string };
      expect(openMessage.url).not.toContain('clipboard');
      expect(openMessage.url).toContain('content=');

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('savedToObsidian'));
    });

    it('shows an error and triggers DOWNLOAD_NOTE fallback on failure', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'COPY_TO_CLIPBOARD') {
          return Promise.resolve({ success: true });
        }
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: false, error: 'Cannot update tab' });
        }
        if (message.type === 'DOWNLOAD_NOTE') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'failed note';
      (document.getElementById('toggle-title') as HTMLInputElement).checked = true;
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('saveFailedDownloaded', { error: 'Cannot update tab' }));
      expect(status.className).toBe('error');

      const downloadCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'DOWNLOAD_NOTE',
      );
      expect(downloadCall).toBeDefined();
    });

    it('falls back to download when current tab is not available', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'DOWNLOAD_NOTE') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
      });
      (chrome.tabs.query as Mock).mockResolvedValue([]);
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'no tab note';
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('saveFailedDownloaded', { error: t('cannotGetCurrentTab') }));

      const downloadCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'DOWNLOAD_NOTE',
      );
      expect(downloadCall).toBeDefined();
      const downloadMessage = downloadCall![0] as unknown as { filename: string; content: string };
      expect(downloadMessage.filename).toMatch(/\.md$/);
      expect(downloadMessage.content).toContain('no tab note');
    });

    it('shows error when both Obsidian and download fallback fail', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'COPY_TO_CLIPBOARD') {
          return Promise.resolve({ success: true });
        }
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: false, error: 'Obsidian rejected' });
        }
        if (message.type === 'DOWNLOAD_NOTE') {
          return Promise.resolve({ ok: false, error: 'download denied' });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'double fail note';
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(
        t('saveFailedDownloadFailed', { error: 'Obsidian rejected', downloadError: 'download denied' }),
      );
      expect(status.className).toBe('error');
    });
  });

  describe('target path override', () => {
    it('uses overrides in handleSave path', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'COPY_TO_CLIPBOARD') {
          return Promise.resolve({ success: true });
        }
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const { init, openTargetEdit, saveTargetEdit, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
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

      const openCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'OPEN_OBSIDIAN_URL',
      );
      expect(openCall).toBeDefined();
      const openMessage = openCall![0] as unknown as { url: string };
      expect(openMessage.url).toContain(
        'file=' + encodeURIComponent('override/folder/override-file'),
      );
    });
  });

  describe('frontmatter section', () => {
    it('renders summary of enabled fields by default', async () => {
      const { init } = await loadPopup({ storedSettings: SETTINGS_WITH_VAULT });
      await init();
      const summary = document.getElementById('frontmatter-summary') as HTMLSpanElement;
      expect(summary.textContent).toContain('title');
      expect(summary.textContent).toContain('url');
    });

    it('expands and collapses on header click', async () => {
      const { init } = await loadPopup({ storedSettings: SETTINGS_WITH_VAULT });
      await init();
      const header = document.getElementById('frontmatter-header') as HTMLDivElement;
      const body = document.getElementById('frontmatter-body') as HTMLDivElement;
      expect(body.classList.contains('visible')).toBe(false);
      header.click();
      expect(body.classList.contains('visible')).toBe(true);
      header.click();
      expect(body.classList.contains('visible')).toBe(false);
    });

    it('shows actual field values when expanded', async () => {
      const { init } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        pageInfo: { ...page, author: 'John Doe' },
      });
      await init();
      document.getElementById('frontmatter-header')?.click();
      const expectedDate = formatFrontmatterDate(FIXED_DATE, SETTINGS_WITH_VAULT.dateFormat).value;
      expect((document.getElementById('fm-url-value') as HTMLSpanElement).textContent).toBe(page.url);
      expect((document.getElementById('fm-date-value') as HTMLSpanElement).textContent).toBe(expectedDate);
      expect((document.getElementById('fm-author-value') as HTMLSpanElement).textContent).toBe('John Doe');
    });

    it('saves frontmatter overrides when toggling checkboxes', async () => {
      const { init } = await loadPopup({ storedSettings: SETTINGS_WITH_VAULT });
      await init();
      document.getElementById('frontmatter-header')?.click();
      const titleCheckbox = document.getElementById('fm-title') as HTMLInputElement;
      titleCheckbox.checked = false;
      titleCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });

      const lastCall = (chrome.storage.local.set as Mock).mock.calls.at(-1);
      const savedDraft = lastCall[0]['oqn:draft'] as Draft;
      expect(savedDraft.frontmatterOverrides).toEqual({ title: false });
    });

    it('uses overrides when saving note', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        frontmatterOverrides: { title: false },
      };
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'OPEN_OBSIDIAN_URL') return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true });
      });
      const tabsSendMessage = vi.fn((_tabId: number, message: { type: string }) => {
        if (message.type === 'GET_PAGE_INFO') return Promise.resolve(page);
        if (message.type === 'COPY_TO_CLIPBOARD') return Promise.resolve({ success: false });
        return Promise.resolve({});
      });
      const { init, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft,
        sendMessage,
        tabsSendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'note body';
      await handleSave();

      const openCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'OPEN_OBSIDIAN_URL',
      );
      expect(openCall).toBeDefined();
      const url = (openCall![0] as unknown as { url: string }).url;
      expect(url).toContain('content=');
      const contentParam = decodeURIComponent(url.split('content=')[1].split('&')[0]);
      expect(contentParam).toContain('note body');
      expect(contentParam).not.toContain('title:');
    });

    it('shows 无 in summary when all frontmatter fields are disabled', async () => {
      const storedSettings: ExtensionSettings = {
        ...SETTINGS_WITH_VAULT,
        includeFrontmatterTitle: false,
        includeFrontmatterDate: false,
        includeFrontmatterUrl: false,
        includeFrontmatterAuthor: false,
        includeFrontmatterDescription: false,
        includeFrontmatterSite: false,
        includeFrontmatterTags: false,
      };
      const { init } = await loadPopup({ storedSettings });
      await init();
      const summary = document.getElementById('frontmatter-summary') as HTMLSpanElement;
      expect(summary.textContent).toBe(t('none'));
    });

    it('initializes checkbox states from stored frontmatterOverrides', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        frontmatterOverrides: { title: false, author: true },
      };
      const { init } = await loadPopup({ storedSettings: SETTINGS_WITH_VAULT, storedDraft });
      await init();
      document.getElementById('frontmatter-header')?.click();
      expect((document.getElementById('fm-title') as HTMLInputElement).checked).toBe(false);
      expect((document.getElementById('fm-author') as HTMLInputElement).checked).toBe(true);
      expect((document.getElementById('fm-date') as HTMLInputElement).checked).toBe(true);
    });

    it('persists { key: true } when toggling a field on while its default is off', async () => {
      const storedSettings: ExtensionSettings = {
        ...SETTINGS_WITH_VAULT,
        includeFrontmatterAuthor: false,
      };
      const { init } = await loadPopup({ storedSettings });
      await init();
      document.getElementById('frontmatter-header')?.click();
      const authorCheckbox = document.getElementById('fm-author') as HTMLInputElement;
      authorCheckbox.checked = true;
      authorCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });

      const lastCall = (chrome.storage.local.set as Mock).mock.calls.at(-1);
      const savedDraft = lastCall[0]['oqn:draft'] as Draft;
      expect(savedDraft.frontmatterOverrides).toEqual({ author: true });
    });

    it('clears frontmatterOverrides after a successful save', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        frontmatterOverrides: { title: false },
      };
      const { init, handleSave, getCurrentDraft } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'note body';
      await handleSave();

      expect(getCurrentDraft().frontmatterOverrides).toEqual({});
    });
  });
});
