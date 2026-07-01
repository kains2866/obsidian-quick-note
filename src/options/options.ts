import { getSettings, setSettings } from '../shared/storage.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import type { ExtensionSettings } from '../shared/types.js';

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

export async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  $('api-url').value = settings.apiUrl;
  $('api-key').value = settings.apiKey;
  $('base-folder').value = settings.baseFolder;
  $('date-template').value = settings.dateSubfolderTemplate;
  $('fm-title').checked = settings.includeFrontmatterTitle;
  $('fm-date').checked = settings.includeFrontmatterDate;
  $('fm-url').checked = settings.includeFrontmatterUrl;
  $('fm-tags').checked = settings.includeFrontmatterTags;
  $('default-tags').value = settings.defaultTags.join(', ');
}

export function readSettings(): ExtensionSettings {
  return {
    apiUrl: $('api-url').value.trim() || DEFAULT_SETTINGS.apiUrl,
    apiKey: $('api-key').value.trim(),
    baseFolder: $('base-folder').value.trim() || DEFAULT_SETTINGS.baseFolder,
    dateSubfolderTemplate: $('date-template').value.trim() || DEFAULT_SETTINGS.dateSubfolderTemplate,
    includeFrontmatterTitle: $('fm-title').checked,
    includeFrontmatterDate: $('fm-date').checked,
    includeFrontmatterUrl: $('fm-url').checked,
    includeFrontmatterTags: $('fm-tags').checked,
    defaultTags: $('default-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
  };
}

export async function testConnection(): Promise<void> {
  const settings = readSettings();
  const status = $('connection-status');
  status.textContent = '连接中...';
  const { ok } = await chrome.runtime.sendMessage({
    type: 'TEST_CONNECTION',
    settings,
  });
  status.textContent = ok ? '连接成功' : '连接失败';
  status.className = ok ? 'success' : 'error';
}

document.getElementById('test-connection')?.addEventListener('click', testConnection);

document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await setSettings(readSettings());
  alert('设置已保存');
});

loadSettings();
