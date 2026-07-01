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
import type { ExtensionSettings } from '../../src/shared/types.js';

type OptionsModule = typeof import('../../src/options/options.js');

const FORM_HTML = `
  <form id="settings-form">
    <input type="text" id="api-url" value="http://127.0.0.1:27123" />
    <input type="password" id="api-key" />
    <button type="button" id="test-connection">测试连接</button>
    <span id="connection-status"></span>
    <input type="text" id="base-folder" value="速记" />
    <input type="text" id="date-template" value="{{YYYY}}/{{MM}}" />
    <input type="checkbox" id="fm-title" />
    <input type="checkbox" id="fm-date" />
    <input type="checkbox" id="fm-url" />
    <input type="checkbox" id="fm-tags" />
    <input type="text" id="default-tags" value="quick-note" />
    <input type="checkbox" id="ignore-cert" />
    <button type="submit">保存设置</button>
  </form>
`;

function renderForm(): void {
  document.body.innerHTML = FORM_HTML;
}

function chromeMock(overrides: {
  storedSettings?: ExtensionSettings;
  sendMessage?: Mock;
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
    runtime: {
      sendMessage: overrides.sendMessage ?? vi.fn(),
    },
  };
}

async function loadOptions(overrides: {
  storedSettings?: ExtensionSettings;
  sendMessage?: Mock;
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
    it('falls back to defaults for empty trimmed values', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('api-url') as HTMLInputElement).value = '   ';
      (document.getElementById('base-folder') as HTMLInputElement).value = '';
      (document.getElementById('date-template') as HTMLInputElement).value = '  ';

      const settings = readSettings();

      expect(settings.apiUrl).toBe(DEFAULT_SETTINGS.apiUrl);
      expect(settings.baseFolder).toBe(DEFAULT_SETTINGS.baseFolder);
      expect(settings.dateSubfolderTemplate).toBe(
        DEFAULT_SETTINGS.dateSubfolderTemplate,
      );
    });

    it('trims all text input values', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('api-url') as HTMLInputElement).value =
        '  http://example.com  ';
      (document.getElementById('api-key') as HTMLInputElement).value =
        '  secret-key  ';
      (document.getElementById('base-folder') as HTMLInputElement).value =
        '  notes  ';
      (document.getElementById('date-template') as HTMLInputElement).value =
        '  {{YYYY}}  ';
      (document.getElementById('default-tags') as HTMLInputElement).value =
        '  a  ,  b  ';

      const settings = readSettings();

      expect(settings.apiUrl).toBe('http://example.com');
      expect(settings.apiKey).toBe('secret-key');
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

      (document.getElementById('default-tags') as HTMLInputElement).value =
        '   ,   ';

      const settings = readSettings();

      expect(settings.defaultTags).toEqual([]);
    });

    it('maps frontmatter checkboxes to booleans', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('fm-title') as HTMLInputElement).checked = true;
      (document.getElementById('fm-date') as HTMLInputElement).checked = false;
      (document.getElementById('fm-url') as HTMLInputElement).checked = true;
      (document.getElementById('fm-tags') as HTMLInputElement).checked = false;

      const settings = readSettings();

      expect(settings.includeFrontmatterTitle).toBe(true);
      expect(settings.includeFrontmatterDate).toBe(false);
      expect(settings.includeFrontmatterUrl).toBe(true);
      expect(settings.includeFrontmatterTags).toBe(false);
    });

    it('maps ignore-cert checkbox to ignoreCertErrors boolean', async () => {
      const { readSettings } = await loadOptions();

      (document.getElementById('ignore-cert') as HTMLInputElement).checked = true;

      const settings = readSettings();

      expect(settings.ignoreCertErrors).toBe(true);
    });
  });

  describe('loadSettings flow', () => {
    it('populates form fields with default settings', async () => {
      const { loadSettings } = await loadOptions();
      await loadSettings();

      expect(
        (document.getElementById('api-url') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.apiUrl);
      expect(
        (document.getElementById('api-key') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.apiKey);
      expect(
        (document.getElementById('base-folder') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.baseFolder);
      expect(
        (document.getElementById('date-template') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.dateSubfolderTemplate);
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
        (document.getElementById('fm-tags') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.includeFrontmatterTags);
      expect(
        (document.getElementById('default-tags') as HTMLInputElement).value,
      ).toBe(DEFAULT_SETTINGS.defaultTags.join(', '));
      expect(
        (document.getElementById('ignore-cert') as HTMLInputElement).checked,
      ).toBe(DEFAULT_SETTINGS.ignoreCertErrors);
    });
  });

  describe('testConnection flow', () => {
    it('sends TEST_CONNECTION message with current settings when button is clicked', async () => {
      const sendMessage = vi.fn((_message: unknown) =>
        Promise.resolve({ ok: true }),
      );
      await loadOptions({ sendMessage });

      (
        document.getElementById('api-url') as HTMLInputElement
      ).value = 'http://custom.local';
      (
        document.getElementById('base-folder') as HTMLInputElement
      ).value = 'custom-folder';

      document.getElementById('test-connection')?.click();

      await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
      const call = sendMessage.mock.calls[0][0] as {
        type: string;
        settings: ExtensionSettings;
      };
      expect(call.type).toBe('TEST_CONNECTION');
      expect(call.settings).toEqual(
        expect.objectContaining({
          apiUrl: 'http://custom.local',
          baseFolder: 'custom-folder',
        }),
      );
    });

    it('shows 连接成功 on successful response', async () => {
      const sendMessage = vi.fn((_message: unknown) =>
        Promise.resolve({ ok: true }),
      );
      const { testConnection } = await loadOptions({ sendMessage });

      await testConnection();

      const status = document.getElementById('connection-status') as HTMLSpanElement;
      expect(status.textContent).toBe('连接成功');
      expect(status.className).toBe('success');
    });

    it('shows 连接失败 on failed response', async () => {
      const sendMessage = vi.fn((_message: unknown) =>
        Promise.resolve({ ok: false }),
      );
      const { testConnection } = await loadOptions({ sendMessage });

      await testConnection();

      const status = document.getElementById('connection-status') as HTMLSpanElement;
      expect(status.textContent).toBe('连接失败');
      expect(status.className).toBe('error');
    });

    it('sets status to 连接中... while waiting', async () => {
      let resolvePromise: (value: { ok: boolean }) => void;
      const sendMessage = vi.fn((_message: unknown) =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolvePromise = resolve;
        }),
      );
      const { testConnection } = await loadOptions({ sendMessage });

      const promise = testConnection();
      const status = document.getElementById('connection-status') as HTMLSpanElement;
      expect(status.textContent).toBe('连接中...');

      resolvePromise!({ ok: true });
      await promise;
    });
  });

  describe('form submit flow', () => {
    it('calls setSettings via storage.local.set with values from readSettings', async () => {
      const { readSettings } = await loadOptions();

      (
        document.getElementById('api-url') as HTMLInputElement
      ).value = 'http://submit.example';
      (
        document.getElementById('api-key') as HTMLInputElement
      ).value = 'submit-key';
      (
        document.getElementById('base-folder') as HTMLInputElement
      ).value = 'submit-folder';
      (
        document.getElementById('date-template') as HTMLInputElement
      ).value = '{{YYYY}}/{{MM}}/{{DD}}';
      (document.getElementById('fm-title') as HTMLInputElement).checked = false;
      (document.getElementById('fm-date') as HTMLInputElement).checked = true;
      (document.getElementById('fm-url') as HTMLInputElement).checked = false;
      (document.getElementById('fm-tags') as HTMLInputElement).checked = true;
      (
        document.getElementById('default-tags') as HTMLInputElement
      ).value = 'submitted, tags';
      (document.getElementById('ignore-cert') as HTMLInputElement).checked = true;

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
});
