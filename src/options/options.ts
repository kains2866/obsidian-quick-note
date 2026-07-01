import { getSettings, setSettings } from '../shared/storage.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { renderTemplate } from '../shared/templates.js';
import { getLanguage, t, localizePage, localizePlaceholders } from '../shared/i18n.js';
import type { ExtensionSettings, DateFormat } from '../shared/types.js';

document.documentElement.lang = getLanguage();

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
      ? t('currentShortcut', { shortcut: actionCommand.shortcut })
      : t('shortcutNotSet');
  } catch {
    shortcutEl.textContent = t('shortcutReadFailed');
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
      parts.push(t('dateTemplateError'));
    }
  }

  parts.push(t('exampleNote'));

  const displayVault = vaultName || t('exampleVaultName');
  let html = `<strong>${displayVault}</strong>`;
  if (parts.length > 0) {
    html += ' / ' + parts.join(' / ');
  }

  const hints: string[] = [];
  if (!vaultName) {
    hints.push(t('savePathPreviewPlaceholder'));
  }
  if (!baseFolder) {
    hints.push(t('baseFolderEmptyHint'));
  }
  if (!dateTemplate) {
    hints.push(t('dateTemplateEmptyHint'));
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
  alert(t('settingsSaved'));
});

['vault-name', 'base-folder', 'date-template'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', updateSavePathPreview);
});

localizePage();
localizePlaceholders();
// Render an initial preview immediately using the default form values,
// then refresh once stored settings are loaded.
updateSavePathPreview();
loadSettings()
  .then(() => {
    updateSavePathPreview();
  })
  .catch(() => {
    // In non-extension contexts (e.g. local dev server) chrome may be unavailable.
    updateSavePathPreview();
  });
loadCurrentShortcut();
