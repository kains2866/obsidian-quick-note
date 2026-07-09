import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import {
  DEFAULT_SETTINGS,
  AUTHOR_NAME,
  AUTHOR_EMAIL,
  GITHUB_REPO_URL,
} from '../../src/shared/constants.js';
import { t } from '../../src/shared/i18n.js';
import type { ExtensionSettings } from '../../src/shared/types.js';

type OptionsModule = typeof import('../../src/options/options.js');

const FORM_HTML = `
  <form id="settings-form">
    <input type="text" id="vault-name" value="" />
    <input type="text" id="base-folder" value="速记" />
    <input type="text" id="date-template" value="{{YYYY}}/{{MM}}" />
    <input type="checkbox" id="include-selected-text" />
    <input type="checkbox" id="preserve-images-in-selection" checked />
    <input type="checkbox" id="capture-video-progress" checked />
    <input type="checkbox" id="auto-select-first-tag" />
    <select id="date-format">
      <option value="date">YYYY-MM-DD</option>
      <option value="datetime">YYYY-MM-DD HH:mm:ss</option>
      <option value="iso">ISO 8601</option>
    </select>
    <input type="checkbox" id="fm-title" />
    <input type="checkbox" id="fm-date" />
    <input type="checkbox" id="fm-url" />
    <input type="checkbox" id="fm-author" />
    <input type="checkbox" id="fm-description" />
    <input type="checkbox" id="fm-site" />
    <input type="checkbox" id="fm-tags" />
    <input type="text" id="default-tags" value="quick-note" />
    <div id="domain-rules-list"></div>
    <input type="text" id="domain-rule-domain" />
    <input type="text" id="domain-rule-tags" />
    <button type="button" id="add-domain-rule"></button>
    <div class="preview-box">
      <strong>保存位置预览</strong>
      <div id="save-path-preview">请先填写 Obsidian 仓库名</div>
    </div>
    <button type="submit">保存设置</button>
    <span id="current-shortcut">当前快捷键：读取中…</span>
    <button type="button" id="open-shortcuts">编辑快捷键</button>
  </form>
`;

function renderForm(): void {
  document.body.innerHTML = FORM_HTML;
}

function chromeMock(overrides: {
  storedSettings?: ExtensionSettings;
  commands?: Mock;
} = {}) {
  return {
    storage: {
      local: {
        get: vi.fn(() =>
          Promise.resolve({
            'oqn:settings': overrides.storedSettings ?? DEFAULT_SETTINGS,
          }),
        ),
        set: vi.fn(() => Promise.resolve()),
      },
    },
    commands: {
      getAll: overrides.commands ?? vi.fn(() => Promise.resolve([
        { name: '_execute_action', shortcut: 'Ctrl+Shift+P', description: 'Open popup' },
      ])),
    },
  };
}

async function loadOptions(overrides: {
  storedSettings?: ExtensionSettings;
  commands?: Mock;
} = {}): Promise<OptionsModule> {
  renderForm();
  vi.stubGlobal('chrome', chromeMock(overrides));
  vi.stubGlobal('alert', vi.fn());
  vi.resetModules();
  return import('../../src/options/options.js');
}

describe('options page', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('readSettings business logic', () => {
    it('preserves empty base folder', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('base-folder') as HTMLInputElement).value = '';

      const settings = readSettings();

      expect(settings.baseFolder).toBe('');
    });

    it('preserves an empty date subfolder template', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('date-template') as HTMLInputElement).value = '';

      const settings = readSettings();

      expect(settings.dateSubfolderTemplate).toBe('');
    });

    it('trims all text input values', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('vault-name') as HTMLInputElement).value = '  MyVault  ';
      (document.getElementById('base-folder') as HTMLInputElement).value = '  notes  ';
      (document.getElementById('date-template') as HTMLInputElement).value = '  {{YYYY}}  ';
      (document.getElementById('default-tags') as HTMLInputElement).value = '  a  ,  b  ';

      const settings = readSettings();

      expect(settings.vaultName).toBe('MyVault');
      expect(settings.baseFolder).toBe('notes');
      expect(settings.dateSubfolderTemplate).toBe('{{YYYY}}');
      expect(settings.defaultTags).toEqual(['a', 'b']);
    });

    it('parses comma-separated tags into an array and filters empties', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('default-tags') as HTMLInputElement).value =
        'clip, article,  todo ,, ';

      const settings = readSettings();

      expect(settings.defaultTags).toEqual(['clip', 'article', 'todo']);
    });

    it('returns an empty array when default-tags is blank', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('default-tags') as HTMLInputElement).value = '   ,   ';

      const settings = readSettings();

      expect(settings.defaultTags).toEqual([]);
    });

    it('maps frontmatter checkboxes to booleans', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('fm-title') as HTMLInputElement).checked = true;
      (document.getElementById('fm-date') as HTMLInputElement).checked = false;
      (document.getElementById('fm-url') as HTMLInputElement).checked = true;
      (document.getElementById('fm-author') as HTMLInputElement).checked = true;
      (document.getElementById('fm-description') as HTMLInputElement).checked = false;
      (document.getElementById('fm-site') as HTMLInputElement).checked = true;
      (document.getElementById('fm-tags') as HTMLInputElement).checked = false;

      const settings = readSettings();

      expect(settings.includeFrontmatterTitle).toBe(true);
      expect(settings.includeFrontmatterDate).toBe(false);
      expect(settings.includeFrontmatterUrl).toBe(true);
      expect(settings.includeFrontmatterAuthor).toBe(true);
      expect(settings.includeFrontmatterDescription).toBe(false);
      expect(settings.includeFrontmatterSite).toBe(true);
      expect(settings.includeFrontmatterTags).toBe(false);
    });

    it('maps preserveImagesInSelection checkbox to boolean', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('preserve-images-in-selection') as HTMLInputElement).checked = false;

      const settings = readSettings();

      expect(settings.preserveImagesInSelection).toBe(false);
    });

    it('maps captureVideoProgress checkbox to boolean', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('capture-video-progress') as HTMLInputElement).checked = false;

      const settings = readSettings();

      expect(settings.captureVideoProgress).toBe(false);
    });

    it('maps autoSelectFirstTag checkbox to boolean', async () => {
      const { readSettings } = await loadOptions();
      (document.getElementById('auto-select-first-tag') as HTMLInputElement).checked = false;
      const settings = readSettings();
      expect(settings.autoSelectFirstTag).toBe(false);
    });

    it('returns empty domain tag rules by default', async () => {
      const { readSettings } = await loadOptions();
      const settings = readSettings();
      expect(settings.domainTagRules).toEqual([]);
    });
  });

  describe('loadSettings flow', () => {
    it('populates form fields with default settings', async () => {
      const { loadSettings } = await loadOptions();
      await loadSettings();

      expect(
        (document.getElementById('vault-name') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.vaultName);
      expect(
        (document.getElementById('base-folder') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.baseFolder);
      expect(
        (document.getElementById('date-template') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.dateSubfolderTemplate);
      expect(
        (document.getElementById('date-format') as HTMLSelectElement).value,
      ).toBe(DEFAULT_SETTINGS.dateFormat);
      expect(
        (document.getElementById('include-selected-text') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeSelectedText);
      expect(
        (document.getElementById('preserve-images-in-selection') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.preserveImagesInSelection);
      expect(
        (document.getElementById('capture-video-progress') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.captureVideoProgress);
      expect(
        (document.getElementById('fm-title') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterTitle);
      expect(
        (document.getElementById('fm-date') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterDate);
      expect(
        (document.getElementById('fm-url') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterUrl);
      expect(
        (document.getElementById('fm-author') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterAuthor);
      expect(
        (document.getElementById('fm-description') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterDescription);
      expect(
        (document.getElementById('fm-site') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterSite);
      expect(
        (document.getElementById('fm-tags') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterTags);
      expect(
        (document.getElementById('default-tags') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.defaultTags.join(', '));
      expect(
        (document.getElementById('auto-select-first-tag') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.autoSelectFirstTag);
    });
  });

  describe('domain tag rules', () => {
    it('loads stored rules into the list', async () => {
      const storedSettings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        domainTagRules: [
          { domain: 'bilibili.com', tags: ['bilibili', '视频笔记'] },
          { domain: 'youtube.com', tags: ['youtube'] },
        ],
      };
      const { loadSettings } = await loadOptions({ storedSettings });
      await loadSettings();

      const items = document.querySelectorAll('.domain-rule-item');
      expect(items.length).toBe(2);
      expect(items[0].querySelector('.domain-rule-domain')?.textContent).toBe('bilibili.com');
      expect(items[0].querySelector('.domain-rule-tags')?.textContent).toBe('bilibili, 视频笔记');
      expect(items[1].querySelector('.domain-rule-domain')?.textContent).toBe('youtube.com');
    });

    it('adds a rule and includes it in readSettings', async () => {
      await loadOptions();
      const domainInput = document.getElementById('domain-rule-domain') as HTMLInputElement;
      const tagsInput = document.getElementById('domain-rule-tags') as HTMLInputElement;
      const addBtn = document.getElementById('add-domain-rule') as HTMLButtonElement;

      domainInput.value = 'github.com';
      tagsInput.value = 'github, dev';
      addBtn.click();

      await vi.waitFor(() => {
        expect(document.querySelectorAll('.domain-rule-item').length).toBe(1);
      });

      const { readSettings } = await import('../../src/options/options.js');
      const settings = readSettings();
      expect(settings.domainTagRules).toEqual([{ domain: 'github.com', tags: ['github', 'dev'] }]);
    });

    it('normalizes a full URL domain to just the hostname', async () => {
      await loadOptions();
      const domainInput = document.getElementById('domain-rule-domain') as HTMLInputElement;
      const tagsInput = document.getElementById('domain-rule-tags') as HTMLInputElement;
      const addBtn = document.getElementById('add-domain-rule') as HTMLButtonElement;

      domainInput.value = 'https://news.163.com/path';
      tagsInput.value = '网易新闻';
      addBtn.click();

      await vi.waitFor(() => {
        expect(document.querySelectorAll('.domain-rule-item').length).toBe(1);
      });

      const displayedDomain = document.querySelector('.domain-rule-domain')?.textContent;
      expect(displayedDomain).toBe('news.163.com');

      const { readSettings } = await import('../../src/options/options.js');
      const settings = readSettings();
      expect(settings.domainTagRules).toEqual([{ domain: 'news.163.com', tags: ['网易新闻'] }]);
    });

    it('removes a rule when clicking delete', async () => {
      const storedSettings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        domainTagRules: [{ domain: 'bilibili.com', tags: ['bilibili'] }],
      };
      await loadOptions({ storedSettings });
      const { loadSettings } = await import('../../src/options/options.js');
      await loadSettings();

      const removeBtn = document.querySelector('.domain-rule-remove') as HTMLButtonElement;
      removeBtn.click();

      await vi.waitFor(() => {
        expect(document.querySelectorAll('.domain-rule-item').length).toBe(0);
      });

      const { readSettings } = await import('../../src/options/options.js');
      const settings = readSettings();
      expect(settings.domainTagRules).toEqual([]);
    });

    it('edits a rule and saves the updated domain and tags', async () => {
      const storedSettings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        domainTagRules: [{ domain: 'bilibili.com', tags: ['bilibili'] }],
      };
      await loadOptions({ storedSettings });
      const { loadSettings } = await import('../../src/options/options.js');
      await loadSettings();

      const editBtn = document.querySelector('.domain-rule-edit') as HTMLButtonElement;
      editBtn.click();

      const domainInput = document.querySelector('.domain-rule-edit-domain') as HTMLInputElement;
      const tagsInput = document.querySelector('.domain-rule-edit-tags') as HTMLInputElement;
      const saveBtn = document.querySelector('.domain-rule-save') as HTMLButtonElement;

      domainInput.value = '163.com/news';
      tagsInput.value = '网易新闻';
      saveBtn.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.domain-rule-domain')?.textContent).toBe('163.com/news');
      });

      const { readSettings } = await import('../../src/options/options.js');
      const settings = readSettings();
      expect(settings.domainTagRules).toEqual([{ domain: '163.com/news', tags: ['网易新闻'] }]);
    });

    it('rejects invalid domain input with an apostrophe', async () => {
      await loadOptions();
      const domainInput = document.getElementById('domain-rule-domain') as HTMLInputElement;
      const tagsInput = document.getElementById('domain-rule-tags') as HTMLInputElement;
      const addBtn = document.getElementById('add-domain-rule') as HTMLButtonElement;

      domainInput.value = "sa'd";
      tagsInput.value = 'tag';
      addBtn.click();

      expect(document.querySelectorAll('.domain-rule-item').length).toBe(0);
    });
  });

  describe('loadCurrentShortcut flow', () => {
    it('displays the current action shortcut', async () => {
      const { loadCurrentShortcut } = await loadOptions();
      await loadCurrentShortcut();

      expect(document.getElementById('current-shortcut')?.textContent).toBe(
        t('currentShortcut', { shortcut: 'Ctrl+Shift+P' }),
      );
    });

    it('shows unconfigured when action shortcut is empty', async () => {
      const commands = vi.fn(() =>
        Promise.resolve([
          { name: '_execute_action', shortcut: '', description: 'Open popup' },
        ]),
      );
      const { loadCurrentShortcut } = await loadOptions({ commands });
      await loadCurrentShortcut();

      expect(document.getElementById('current-shortcut')?.textContent).toBe(
        t('shortcutNotSet'),
      );
    });

    it('shows error message when getAll fails', async () => {
      const commands = vi.fn(() => Promise.reject(new Error('not allowed')));
      const { loadCurrentShortcut } = await loadOptions({ commands });
      await loadCurrentShortcut();

      expect(document.getElementById('current-shortcut')?.textContent).toBe(
        t('shortcutReadFailed'),
      );
    });
  });

  describe('form submit flow', () => {
    it('calls setSettings via storage.local.set with values from readSettings', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('vault-name') as HTMLInputElement).value = 'SubmitVault';
      (document.getElementById('base-folder') as HTMLInputElement).value = 'submit-folder';
      (document.getElementById('date-template') as HTMLInputElement).value =
        '{{YYYY}}/{{MM}}/{{DD}}';
      (document.getElementById('date-format') as HTMLSelectElement).value = 'datetime';
      (document.getElementById('include-selected-text') as HTMLInputElement).checked = false;
      (document.getElementById('fm-title') as HTMLInputElement).checked = false;
      (document.getElementById('fm-date') as HTMLInputElement).checked = true;
      (document.getElementById('fm-url') as HTMLInputElement).checked = false;
      (document.getElementById('fm-tags') as HTMLInputElement).checked = true;
      (document.getElementById('default-tags') as HTMLInputElement).value = 'submitted, tags';

      const expected = readSettings();
      const form = document.getElementById('settings-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await vi.waitFor(() =>
        expect(chrome.storage.local.set).toHaveBeenCalledTimes(1),
      );
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'oqn:settings': expected,
      });
    });
  });

  describe('footer metadata', () => {
    it('renders author name, github link and email from constants', async () => {
      document.body.innerHTML = `
        <form id="settings-form"></form>
        <footer>
          <strong class="author-name" id="footer-author-name"></strong>
          <a id="footer-github-link" href="#">GitHub</a>
          <a id="footer-email-link" href="#">Email</a>
          <a id="support-star-link" href="#">Star</a>
        </footer>
      `;
      vi.stubGlobal('chrome', chromeMock());
      vi.resetModules();
      await import('../../src/options/options.js');

      expect(document.getElementById('footer-author-name')?.textContent).toBe(AUTHOR_NAME);
      expect((document.getElementById('footer-github-link') as HTMLAnchorElement).href).toBe(
        GITHUB_REPO_URL,
      );
      expect((document.getElementById('footer-email-link') as HTMLAnchorElement).href).toBe(
        `mailto:${AUTHOR_EMAIL}`,
      );
      expect((document.getElementById('support-star-link') as HTMLAnchorElement).href).toBe(
        GITHUB_REPO_URL,
      );

      vi.unstubAllGlobals();
    });
  });

  describe('save path preview', () => {
    it('shows example path with a hint when vault name is empty', async () => {
      await loadOptions();
      (document.getElementById('vault-name') as HTMLInputElement).value = '';

      const { updateSavePathPreview } = await import('../../src/options/options.js');
      updateSavePathPreview();

      const previewEl = document.getElementById('save-path-preview') as HTMLDivElement;
      expect(previewEl.textContent).toContain(t('savePathPreviewPlaceholder'));
      expect(previewEl.textContent).toContain(t('exampleVaultName'));
      expect(previewEl.innerHTML).toContain('muted');
    });

    it('renders full path when all fields are filled', async () => {
      await loadOptions();
      (document.getElementById('vault-name') as HTMLInputElement).value = 'MyVault';
      (document.getElementById('base-folder') as HTMLInputElement).value = '速记';
      (document.getElementById('date-template') as HTMLInputElement).value = '{{YYYY}}/{{MM}}';

      const { updateSavePathPreview } = await import('../../src/options/options.js');
      updateSavePathPreview();

      const previewEl = document.getElementById('save-path-preview') as HTMLDivElement;
      expect(previewEl.textContent).toContain('MyVault');
      expect(previewEl.textContent).toContain('速记');
      expect(previewEl.textContent).toContain(t('exampleNote'));
    });

    it('shows hints when base folder and date template are empty', async () => {
      await loadOptions();
      (document.getElementById('vault-name') as HTMLInputElement).value = 'MyVault';
      (document.getElementById('base-folder') as HTMLInputElement).value = '';
      (document.getElementById('date-template') as HTMLInputElement).value = '';

      const { updateSavePathPreview } = await import('../../src/options/options.js');
      updateSavePathPreview();

      const previewEl = document.getElementById('save-path-preview') as HTMLDivElement;
      expect(previewEl.textContent).toContain(t('baseFolderEmptyHint'));
      expect(previewEl.textContent).toContain(t('dateTemplateEmptyHint'));
    });
  });
});
