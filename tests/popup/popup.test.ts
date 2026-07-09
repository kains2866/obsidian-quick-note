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
      <div class="target-edit-toggles">
        <label><input type="checkbox" id="toggle-url" /> URL</label>
        <label><input type="checkbox" id="toggle-title" /> 标题</label>
      </div>
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
    <div class="tag-bar" id="tag-bar">
      <span class="tag-bar-label">tags</span>
      <div class="tag-list" id="tag-list"></div>
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
  storedDrafts?: Record<number, Draft>;
  activeTabId?: number | undefined;
  pageInfo?: PageInfo;
  sendMessage?: Mock;
  tabsSendMessage?: Mock;
} = {}) {
  const mockStorage: Record<string, unknown> = {};
  if (overrides.storedSettings !== undefined) {
    mockStorage[STORAGE_KEYS.settings] = overrides.storedSettings;
  }
  if (overrides.storedDrafts !== undefined) {
    mockStorage[STORAGE_KEYS.drafts] = overrides.storedDrafts;
  }

  const activeTabId = overrides.activeTabId;

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
        Promise.resolve([{ id: activeTabId, url: page.url, title: page.title }]),
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
  activeTabId?: number;
  pageInfo?: PageInfo;
  sendMessage?: Mock;
  tabsSendMessage?: Mock;
} = {}): Promise<PopupModule> {
  renderPopup();
  const activeTabId = overrides.activeTabId ?? 1;
  const storedDrafts = overrides.storedDraft !== undefined ? { [activeTabId]: overrides.storedDraft } : undefined;
  vi.stubGlobal('chrome', chromeMock({ ...overrides, activeTabId, storedDrafts }));
  vi.resetModules();
  return import('../../src/popup/popup.js');
}

function getLastSavedDraft(tabId: number = 1): Draft | undefined {
  const calls = (chrome.storage.local.set as Mock).mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const drafts = calls[i][0][STORAGE_KEYS.drafts] as Record<number, Draft> | undefined;
    if (drafts && drafts[tabId] !== undefined) {
      return drafts[tabId];
    }
  }
  return undefined;
}

function wasDraftCleared(tabId: number = 1): boolean {
  const calls = (chrome.storage.local.set as Mock).mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const drafts = calls[i][0][STORAGE_KEYS.drafts] as Record<number, Draft> | undefined;
    if (drafts && !(tabId in drafts)) {
      return true;
    }
  }
  return false;
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

    it('appends selected text to existing draft content', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft',
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: { ...page, selectedText: 'new selection' },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'existing draft\n\nnew selection',
      );
    });

    it('does not append duplicate selected text', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft\n\nduplicate selection',
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: { ...page, selectedText: 'duplicate selection' },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'existing draft\n\nduplicate selection',
      );
    });

    it('prefills editor with selectedContent when preserveImagesInSelection is enabled', async () => {
      const { init } = await loadPopup({
        storedDraft: DEFAULT_DRAFT,
        pageInfo: {
          ...page,
          selectedText: 'plain text',
          selectedContent: 'text with ![chart](https://example.com/chart.png) image',
        },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe(
        'text with ![chart](https://example.com/chart.png) image',
      );
    });

    it('prefills editor with selectedText when preserveImagesInSelection is disabled', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, preserveImagesInSelection: false },
        storedDraft: DEFAULT_DRAFT,
        pageInfo: {
          ...page,
          selectedText: 'plain text',
          selectedContent: 'text with ![chart](https://example.com/chart.png) image',
        },
      });
      await init();

      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe('plain text');
    });

    it('appends video progress link when capture is enabled and video is playing', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft',
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: {
          ...page,
          videoProgress: {
            currentTime: '00:04:32',
            duration: '00:12:34',
            title: 'Test Video',
            link: 'https://example.com/watch?t=272',
            platform: 'generic',
          },
        },
      });
      await init();

      const value = (document.getElementById('editor') as HTMLTextAreaElement).value;
      expect(value).toContain('existing draft');
      expect(value).toContain('[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)');
    });

    it('does not append video progress link when capture is disabled', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft',
      };
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, captureVideoProgress: false },
        storedDraft,
        pageInfo: {
          ...page,
          videoProgress: {
            currentTime: '00:04:32',
            duration: '00:12:34',
            title: 'Test Video',
            link: 'https://example.com/watch?t=272',
            platform: 'generic',
          },
        },
      });
      await init();

      const value = (document.getElementById('editor') as HTMLTextAreaElement).value;
      expect(value).toBe('existing draft');
    });

    it('places video link before selected text', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft',
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: {
          ...page,
          selectedText: 'highlighted passage',
          videoProgress: {
            currentTime: '00:04:32',
            duration: '00:12:34',
            title: 'Test Video',
            link: 'https://example.com/watch?t=272',
            platform: 'generic',
          },
        },
      });
      await init();

      const value = (document.getElementById('editor') as HTMLTextAreaElement).value;
      expect(value).toBe(
        'existing draft\n\n[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)\n\nhighlighted passage',
      );
    });

    it('does not duplicate video link when progress is unchanged', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft\n\n[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)',
        lastVideoProgress: { currentTime: 272, url: 'https://example.com/path?x=1' },
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: {
          ...page,
          videoProgress: {
            currentTime: '00:04:32',
            duration: '00:12:34',
            title: 'Test Video',
            link: 'https://example.com/watch?t=272',
            platform: 'generic',
          },
        },
      });
      await init();

      const value = (document.getElementById('editor') as HTMLTextAreaElement).value;
      expect(value).toBe(
        'existing draft\n\n[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)',
      );
    });

    it('appends a new video link when progress changes', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'existing draft\n\n[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)',
        lastVideoProgress: { currentTime: 272, url: 'https://example.com/path?x=1' },
      };
      const { init } = await loadPopup({
        storedDraft,
        pageInfo: {
          ...page,
          videoProgress: {
            currentTime: '00:05:00',
            duration: '00:12:34',
            title: 'Test Video',
            link: 'https://example.com/watch?t=300',
            platform: 'generic',
          },
        },
      });
      await init();

      const value = (document.getElementById('editor') as HTMLTextAreaElement).value;
      expect(value).toContain('[(00:04:32/00:12:34)Test Video](https://example.com/watch?t=272)');
      expect(value).toContain('[(00:05:00/00:12:34)Test Video](https://example.com/watch?t=300)');
    });

    it('isolates drafts between tabs', async () => {
      const { init: initTab1 } = await loadPopup({
        storedDraft: { ...DEFAULT_DRAFT, content: 'tab 1 draft' },
        activeTabId: 1,
      });
      await initTab1();
      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe('tab 1 draft');

      vi.unstubAllGlobals();
      document.body.innerHTML = '';
      vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });

      const { init: initTab2 } = await loadPopup({
        storedDraft: { ...DEFAULT_DRAFT, content: 'tab 2 draft' },
        activeTabId: 2,
      });
      await initTab2();
      expect((document.getElementById('editor') as HTMLTextAreaElement).value).toBe('tab 2 draft');
    });

    it('shows error when current tab id is unavailable', async () => {
      renderPopup();
      vi.stubGlobal('chrome', chromeMock({ activeTabId: undefined }));
      vi.resetModules();
      const { init } = await import('../../src/popup/popup.js');
      await init();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('cannotGetCurrentTab'));
      expect(status.className).toBe('error');
    });

    it('renders tag bar when includeFrontmatterTags is enabled', async () => {
      const { init } = await loadPopup({ storedSettings: SETTINGS_WITH_VAULT });
      await init();
      expect(document.getElementById('tag-bar')?.style.display).not.toBe('none');
    });

    it('hides tag bar when includeFrontmatterTags is disabled', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, includeFrontmatterTags: false },
      });
      await init();
      expect(document.getElementById('tag-bar')?.style.display).toBe('none');
    });

    it('auto-selects first tag when setting is enabled', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note', 'idea'], autoSelectFirstTag: true },
      });
      await init();
      expect(getCurrentDraft().selectedTags).toEqual(['quick-note']);
    });

    it('does not auto-select tag when setting is disabled', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
      });
      await init();
      expect(getCurrentDraft().selectedTags).toEqual([]);
    });
  });

  describe('tag bar', () => {
    it('toggles tag selection when clicking a pill', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
      });
      await init();

      const pill = document.querySelector('.tag-pill:not(.add-tag)') as HTMLSpanElement;
      pill.click();
      expect(getCurrentDraft().selectedTags).toEqual(['quick-note']);

      const pillAfter = document.querySelector('.tag-pill:not(.add-tag)') as HTMLSpanElement;
      pillAfter.click();
      expect(getCurrentDraft().selectedTags).toEqual([]);
    });

    it('adds a temp tag and selects it on Enter', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
      });
      await init();

      const addBtn = document.querySelector('.tag-pill.add-tag') as HTMLSpanElement;
      addBtn.click();
      const input = addBtn.querySelector('input') as HTMLInputElement;
      input.value = 'new idea';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(getCurrentDraft().tempTags).toEqual(['new-idea']);
      expect(getCurrentDraft().selectedTags).toEqual(['new-idea']);
      expect(document.querySelector('.tag-pill.add-tag input')).toBeNull();
    });

    it('does not add a temp tag on Escape', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
      });
      await init();

      const addBtn = document.querySelector('.tag-pill.add-tag') as HTMLSpanElement;
      addBtn.click();
      const input = addBtn.querySelector('input') as HTMLInputElement;
      input.value = 'new idea';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(getCurrentDraft().tempTags ?? []).toEqual([]);
      expect(getCurrentDraft().selectedTags).toEqual([]);
      expect(document.querySelector('.tag-pill.add-tag input')).toBeNull();
    });

    it('keeps typed text when clicking inside the temp-tag input', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
      });
      await init();

      const addBtn = document.querySelector('.tag-pill.add-tag') as HTMLSpanElement;
      addBtn.click();
      const input = addBtn.querySelector('input') as HTMLInputElement;
      input.value = 'typed text';
      input.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(addBtn.querySelector('input')).toBe(input);
      expect((addBtn.querySelector('input') as HTMLInputElement).value).toBe('typed text');
    });

    it('hides tag bar when frontmatter tags checkbox is unchecked', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'] },
      });
      await init();

      expect(document.getElementById('tag-bar')?.style.display).not.toBe('none');

      const fmTags = document.getElementById('fm-tags') as HTMLInputElement;
      fmTags.checked = false;
      fmTags.dispatchEvent(new Event('change', { bubbles: true }));

      expect(document.getElementById('tag-bar')?.style.display).toBe('none');
    });

    it('renders temporary tags with a distinct temp class', async () => {
      const { init } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note'], autoSelectFirstTag: false },
        storedDraft: { ...DEFAULT_DRAFT, tempTags: ['temp-tag'], selectedTags: ['temp-tag'] },
      });
      await init();

      const tempPill = document.querySelector('.tag-pill.temp') as HTMLSpanElement;
      expect(tempPill).not.toBeNull();
      expect(tempPill.textContent).toBe('temp-tag');
      expect(tempPill.classList.contains('selected')).toBe(true);
    });

    it('auto-selects tags from matching domain rules', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: 'bilibili.com', tags: ['bilibili', '视频笔记'] }],
        },
        pageInfo: { ...page, url: 'https://www.bilibili.com/video/BV123' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual(['bilibili', '视频笔记']);
      const pills = Array.from(document.querySelectorAll('.tag-pill:not(.add-tag)'));
      expect(pills.map((p) => p.textContent)).toContain('bilibili');
      expect(pills.map((p) => p.textContent)).toContain('视频笔记');
    });

    it('does not auto-select domain tags when URL does not match', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: 'bilibili.com', tags: ['bilibili'] }],
        },
        pageInfo: { ...page, url: 'https://example.com' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual([]);
    });

    it('combines domain tags with the first global tag when autoSelectFirstTag is on', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note', 'clip'],
          autoSelectFirstTag: true,
          domainTagRules: [{ domain: 'bilibili.com', tags: ['bilibili'] }],
        },
        pageInfo: { ...page, url: 'https://bilibili.com/video/1' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual(['bilibili', 'quick-note']);
    });

    it('matches domain rules written as full URLs', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: 'https://news.163.com', tags: ['网易新闻'] }],
        },
        pageInfo: { ...page, url: 'https://news.163.com/article/1' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual(['网易新闻']);
    });

    it('matches rules that only specify the root domain', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: '163.com', tags: ['网易新闻'] }],
        },
        pageInfo: { ...page, url: 'https://news.163.com/article/1' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual(['网易新闻']);
    });

    it('supports path-based rules like 163.com/news', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: '163.com/news', tags: ['网易新闻'] }],
        },
        pageInfo: { ...page, url: 'https://163.com/news/article/1' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual(['网易新闻']);
    });

    it('does not match path-based rules when the path differs', async () => {
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: {
          ...SETTINGS_WITH_VAULT,
          defaultTags: ['quick-note'],
          autoSelectFirstTag: false,
          domainTagRules: [{ domain: '163.com/news', tags: ['网易新闻'] }],
        },
        pageInfo: { ...page, url: 'https://163.com/sports/article/1' },
      });
      await init();

      expect(getCurrentDraft().selectedTags).toEqual([]);
    });
  });

  describe('handleSave', () => {
    it('saves only selected tags to frontmatter', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'OPEN_OBSIDIAN_URL') return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true });
      });
      const tabsSendMessage = vi.fn((_tabId: number, message: { type: string }) => {
        if (message.type === 'GET_PAGE_INFO') return Promise.resolve(page);
        if (message.type === 'COPY_TO_CLIPBOARD') return Promise.resolve({ success: false });
        return Promise.resolve({});
      });
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        selectedTags: ['idea'],
      };
      const { init, handleSave } = await loadPopup({
        storedSettings: { ...SETTINGS_WITH_VAULT, defaultTags: ['quick-note', 'idea'] },
        storedDraft,
        sendMessage,
        tabsSendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'my note';
      await handleSave();

      const openCall = sendMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'OPEN_OBSIDIAN_URL',
      );
      expect(openCall).toBeDefined();
      const url = (openCall![0] as unknown as { url: string }).url;
      const contentParam = decodeURIComponent(url.split('content=')[1].split('&')[0]);
      expect(contentParam).toContain('tags:\n  - idea');
      expect(contentParam).not.toContain('quick-note');
    });

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

    it('shows an error when current tab id is unavailable', async () => {
      renderPopup();
      vi.stubGlobal('chrome', chromeMock({ activeTabId: undefined, storedSettings: SETTINGS_WITH_VAULT }));
      vi.resetModules();
      const { init, handleSave } = await import('../../src/popup/popup.js');
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'my note';
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('cannotGetCurrentTab'));
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
      expect(wasDraftCleared(1)).toBe(true);
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

    it('keeps draft intact in memory when save fails', async () => {
      const sendMessage = vi.fn((message: { type: string }) => {
        if (message.type === 'OPEN_OBSIDIAN_URL') {
          return Promise.resolve({ ok: false, error: 'Obsidian rejected' });
        }
        if (message.type === 'DOWNLOAD_NOTE') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      });
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        content: 'draft before failure',
      };
      const { init, handleSave, getCurrentDraft } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft,
        sendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'draft before failure';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await handleSave();

      expect(wasDraftCleared(1)).toBe(false);
      expect(getCurrentDraft().content).toBe('draft before failure');
    });

    it('shows error when current tab is not available', async () => {
      renderPopup();
      vi.stubGlobal('chrome', chromeMock({ storedSettings: SETTINGS_WITH_VAULT, activeTabId: undefined }));
      vi.resetModules();
      const { init, handleSave } = await import('../../src/popup/popup.js');
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'no tab note';
      await handleSave();

      const status = document.getElementById('status') as HTMLDivElement;
      expect(status.textContent).toBe(t('cannotGetCurrentTab'));
      expect(status.className).toBe('error');
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
      const { init, openTargetEdit, getCurrentDraft, handleSave } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        sendMessage,
      });
      await init();

      openTargetEdit();
      const folderInput = document.getElementById('target-folder-input') as HTMLInputElement;
      const filenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
      folderInput.value = 'override/folder';
      folderInput.dispatchEvent(new Event('input', { bubbles: true }));
      filenameInput.value = 'override-file';
      filenameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await vi.waitFor(() => {
        const currentDraft = getCurrentDraft();
        expect(currentDraft.targetFolder).toBe('override/folder');
        expect(currentDraft.targetFilename).toBe('override-file');
      });

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

    it('auto-saves folder and filename on input', async () => {
      const { init, openTargetEdit, getCurrentDraft } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft: DEFAULT_DRAFT,
      });
      await init();

      openTargetEdit();
      const folderInput = document.getElementById('target-folder-input') as HTMLInputElement;
      const filenameInput = document.getElementById('target-filename-input') as HTMLInputElement;

      folderInput.value = 'notes/2026';
      folderInput.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.waitFor(() => expect(getCurrentDraft().targetFolder).toBe('notes/2026'));

      filenameInput.value = 'my-file';
      filenameInput.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.waitFor(() => expect(getCurrentDraft().targetFilename).toBe('my-file'));
    });

    it('falls back to auto-generated filename when filename input is cleared', async () => {
      const { init, openTargetEdit, getCurrentDraft, updateTargetPath } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft: { ...DEFAULT_DRAFT, targetFilename: 'manual-file' },
      });
      await init();

      openTargetEdit();
      const filenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
      filenameInput.value = '';
      filenameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await vi.waitFor(() => expect(getCurrentDraft().targetFilename).toBe(''));
      updateTargetPath();
      const targetPath = document.getElementById('target-path') as HTMLDivElement;
      expect(targetPath.textContent).not.toContain('manual-file');
    });

    it('clears manual filename override when toggling URL/Title', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        targetFilename: 'manual-file',
      };
      const { init, getCurrentDraft } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft,
      });
      await init();

      expect(getCurrentDraft().targetFilename).toBe('manual-file');

      const urlToggle = document.getElementById('toggle-url') as HTMLInputElement;
      urlToggle.checked = true;
      urlToggle.dispatchEvent(new Event('change', { bubbles: true }));

      await vi.waitFor(() => {
        expect(getCurrentDraft().targetFilename).toBe('');
      });
    });

    it('shows empty filename input with generated placeholder in target edit when no override exists', async () => {
      const { init, openTargetEdit } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft: DEFAULT_DRAFT,
      });
      await init();

      openTargetEdit();
      const filenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
      expect(filenameInput.value).toBe('');
      // Placeholder shows the auto-generated filename (derived from title/url/content).
      expect(filenameInput.placeholder.length).toBeGreaterThan(0);
    });

    it('toggles target edit panel when clicking target path', async () => {
      const { init, toggleTargetEdit } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft: DEFAULT_DRAFT,
      });
      await init();

      const targetEdit = document.getElementById('target-edit') as HTMLDivElement;
      expect(targetEdit.classList.contains('visible')).toBe(false);

      toggleTargetEdit();
      expect(targetEdit.classList.contains('visible')).toBe(true);

      toggleTargetEdit();
      expect(targetEdit.classList.contains('visible')).toBe(false);
    });

    it('syncs auto-generated filename back into target edit when toggling while editing', async () => {
      const { init, openTargetEdit } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
      });
      await init();

      openTargetEdit();
      const filenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
      filenameInput.value = 'custom-name';

      const urlToggle = document.getElementById('toggle-url') as HTMLInputElement;
      urlToggle.checked = true;
      urlToggle.dispatchEvent(new Event('change', { bubbles: true }));

      expect(filenameInput.value).toBe('example.com-path');
    });

    it('resets draft to defaults after successful save so next popup uses title filename', async () => {
      const storedDraft: Draft = {
        ...DEFAULT_DRAFT,
        includeTitle: false,
        includeUrl: false,
        targetFilename: 'custom-name',
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
      const { init, handleSave, getCurrentDraft } = await loadPopup({
        storedSettings: SETTINGS_WITH_VAULT,
        storedDraft,
        sendMessage,
        tabsSendMessage,
      });
      await init();

      const editor = document.getElementById('editor') as HTMLTextAreaElement;
      editor.value = 'note body';
      await handleSave();

      const currentDraft = getCurrentDraft();
      expect(currentDraft.includeTitle).toBe(DEFAULT_DRAFT.includeTitle);
      expect(currentDraft.includeUrl).toBe(DEFAULT_DRAFT.includeUrl);
      expect(currentDraft.targetFilename).toBe('');
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

      const savedDraft = getLastSavedDraft(1);
      expect(savedDraft?.frontmatterOverrides).toEqual({ title: false });
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

      const savedDraft = getLastSavedDraft(1);
      expect(savedDraft?.frontmatterOverrides).toEqual({ author: true });
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
