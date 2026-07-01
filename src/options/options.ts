import { getSettings, setSettings } from '../shared/storage.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { renderTemplate } from '../shared/templates.js';
import type { ExtensionSettings, DateFormat } from '../shared/types.js';

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

export async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  $('vault-name').value = settings.vaultName;
  $('base-folder').value = settings.baseFolder;
  $('date-template').value = settings.dateSubfolderTemplate;
  $('date-format').value = settings.dateFormat;
  $('include-selected-text').checked = settings.includeSelectedText;
  $('fm-title').checked = settings.includeFrontmatterTitle;
  $('fm-date').checked = settings.includeFrontmatterDate;
  $('fm-url').checked = settings.includeFrontmatterUrl;
  $('fm-author').checked = settings.includeFrontmatterAuthor;
  $('fm-description').checked = settings.includeFrontmatterDescription;
  $('fm-site').checked = settings.includeFrontmatterSite;
  $('fm-tags').checked = settings.includeFrontmatterTags;
  $('default-tags').value = settings.defaultTags.join(', ');
}

export async function loadCurrentShortcut(): Promise<void> {
  const shortcutEl = document.getElementById('current-shortcut');
  if (!shortcutEl) return;

  try {
    const commands = await chrome.commands.getAll();
    const actionCommand = commands.find((cmd) => cmd.name === '_execute_action');
    shortcutEl.textContent = actionCommand?.shortcut
      ? `当前快捷键：${actionCommand.shortcut}`
      : '当前快捷键：未设置';
  } catch {
    shortcutEl.textContent = '当前快捷键：无法读取';
  }
}

const VALID_DATE_FORMATS: DateFormat[] = ['date', 'datetime', 'iso'];

export function readSettings(): ExtensionSettings {
  const rawDateFormat = $('date-format').value as DateFormat;
  const dateFormat = VALID_DATE_FORMATS.includes(rawDateFormat)
    ? rawDateFormat
    : DEFAULT_SETTINGS.dateFormat;

  return {
    vaultName: $('vault-name').value.trim(),
    baseFolder: $('base-folder').value.trim(),
    dateSubfolderTemplate: $('date-template').value.trim(),
    dateFormat,
    includeSelectedText: $('include-selected-text').checked,
    includeFrontmatterTitle: $('fm-title').checked,
    includeFrontmatterDate: $('fm-date').checked,
    includeFrontmatterUrl: $('fm-url').checked,
    includeFrontmatterAuthor: $('fm-author').checked,
    includeFrontmatterDescription: $('fm-description').checked,
    includeFrontmatterSite: $('fm-site').checked,
    includeFrontmatterTags: $('fm-tags').checked,
    defaultTags: $('default-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
  };
}

export function updateSavePathPreview(): void {
  const previewEl = document.getElementById('save-path-preview');
  if (!previewEl) return;

  const vaultName = $('vault-name').value.trim();
  const baseFolder = $('base-folder').value.trim();
  const dateTemplate = $('date-template').value.trim();

  if (!vaultName) {
    previewEl.innerHTML = '<span class="warning">请填写 Obsidian 仓库名</span>';
    return;
  }

  const parts: string[] = [];

  if (baseFolder) {
    parts.push(baseFolder);
  }

  if (dateTemplate) {
    try {
      const dateSubfolder = renderTemplate(dateTemplate, new Date());
      if (dateSubfolder) {
        parts.push(dateSubfolder);
      }
    } catch {
      parts.push('（日期模板格式错误）');
    }
  }

  parts.push('示例笔记.md');

  let html = `<strong>${vaultName}</strong>`;
  if (parts.length > 0) {
    html += ' / ' + parts.join(' / ');
  }

  const hints: string[] = [];
  if (!baseFolder) {
    hints.push('默认保存文件夹为空，将保存到仓库根目录');
  }
  if (!dateTemplate) {
    hints.push('日期子目录模板为空，不创建日期子目录');
  }

  if (hints.length > 0) {
    html += `<div class="muted">${hints.join('；')}</div>`;
  }

  previewEl.innerHTML = html;
}

document.getElementById('open-shortcuts')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await setSettings(readSettings());
  alert('设置已保存');
});

['vault-name', 'base-folder', 'date-template'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', updateSavePathPreview);
});

loadSettings().then(() => {
  updateSavePathPreview();
});
loadCurrentShortcut();
