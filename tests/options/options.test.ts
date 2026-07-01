import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/shared/constants.js';
import { t } from '../../src/shared/i18n.js';
import type { ExtensionSettings } from '../../src/shared/types.js';

type OptionsModule = typeof import('../../src/options/options.js');

const FORM_HTML = `
  <form id="settings-form">
    <input type="text" id="vault-name" value="" />
    <input type="text" id="base-folder" value="速记" />
    <input type="text" id="date-template" value="{{YYYY}}/{{MM}}" />
    <input type="checkbox" id="include-selected-text" />
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

  describe('save path preview', () => {
    it('shows warning when vault name is empty', async () => {
      await loadOptions();
      (document.getElementById('vault-name') as HTMLInputElement).value = '';

      const { updateSavePathPreview } = await import('../../src/options/options.js');
      updateSavePathPreview();

      const previewEl = document.getElementById('save-path-preview') as HTMLDivElement;
      expect(previewEl.textContent).toContain(t('savePathPreviewPlaceholder'));
      expect(previewEl.innerHTML).toContain('warning');
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
