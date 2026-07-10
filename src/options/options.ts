import { getSettings, setSettings } from '../shared/storage.js';
import {
  DEFAULT_SETTINGS,
  EXTENSION_NAME,
  AUTHOR_NAME,
  AUTHOR_EMAIL,
  GITHUB_REPO_URL,
} from '../shared/constants.js';
import { renderTemplate } from '../shared/templates.js';
import { getLanguage, t, localizePage, localizePlaceholders } from '../shared/i18n.js';
import { applyTheme } from '../shared/theme-utils.js';
import type { ExtensionSettings, DateFormat, Theme } from '../shared/types.js';

document.documentElement.lang = getLanguage();
document.title = t('optionsTitle');

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

const domainRulesList = document.getElementById('domain-rules-list') as HTMLDivElement | null;
const domainRuleDomain = document.getElementById('domain-rule-domain') as HTMLInputElement | null;
const domainRuleTags = document.getElementById('domain-rule-tags') as HTMLInputElement | null;
const addDomainRuleBtn = document.getElementById('add-domain-rule') as HTMLButtonElement | null;

let domainTagRules: Array<{ domain: string; tags: string[] }> = [];
let editingRuleIndex: number | null = null;
let isDirty = false;

function markDirty(): void {
  isDirty = true;
}

function clearDirty(): void {
  isDirty = false;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseTagsInput(value: string): string[] {
  return value.split(',').map((t) => t.trim()).filter(Boolean);
}

function normalizeDomain(value: string): string {
  let domain = value.trim();
  if (domain.includes('://')) {
    try {
      domain = new URL(domain).hostname;
    } catch {
      // Keep the raw value if it's not a valid URL.
    }
  }
  return domain.toLowerCase();
}

function isValidDomain(value: string): boolean {
  const normalized = normalizeDomain(value);
  if (!normalized) return false;

  const [host, ...pathParts] = normalized.split('/');
  const path = pathParts.join('/');

  // Host part: letters, digits, hyphens, dots, and unicode letters; must look like a domain.
  const hostValid = /^[a-z0-9\u4e00-\u9fa5]([a-z0-9\-\u4e00-\u9fa5]*\.?)+$/i.test(host);
  if (!hostValid) return false;

  // Path part (optional): letters, digits, hyphens, underscores, and slashes.
  if (path && !/^[a-z0-9_\-\/]+$/i.test(path)) return false;

  return true;
}

function renderDomainRules(): void {
  if (!domainRulesList) return;
  domainRulesList.innerHTML = '';
  domainTagRules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'domain-rule-item';

    if (editingRuleIndex === index) {
      item.innerHTML = `
        <input type="text" class="domain-rule-edit-domain" value="${escapeHtml(rule.domain)}" />
        <input type="text" class="domain-rule-edit-tags" value="${escapeHtml(rule.tags.join(', '))}" />
        <div class="domain-rule-actions">
          <button type="button" class="domain-rule-save" data-index="${index}" data-i18n="saveDomainRule">保存</button>
          <button type="button" class="domain-rule-remove" data-index="${index}" data-i18n="removeDomainRule">删除</button>
        </div>
      `;
      item.querySelector('.domain-rule-save')?.addEventListener('click', () => saveDomainRule(index));
      item.querySelector('.domain-rule-remove')?.addEventListener('click', () => removeDomainRule(index));
      item.querySelector('.domain-rule-edit-domain')?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') saveDomainRule(index);
      });
      item.querySelector('.domain-rule-edit-tags')?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') saveDomainRule(index);
      });
    } else {
      item.innerHTML = `
        <span class="domain-rule-domain">${escapeHtml(rule.domain)}</span>
        <span class="domain-rule-tags">${escapeHtml(rule.tags.join(', '))}</span>
        <div class="domain-rule-actions">
          <button type="button" class="domain-rule-edit" data-index="${index}" data-i18n="editDomainRule">编辑</button>
          <button type="button" class="domain-rule-remove" data-index="${index}" data-i18n="removeDomainRule">删除</button>
        </div>
      `;
      item.querySelector('.domain-rule-edit')?.addEventListener('click', () => startEditingDomainRule(index));
      item.querySelector('.domain-rule-remove')?.addEventListener('click', () => removeDomainRule(index));
    }

    domainRulesList.appendChild(item);
  });
  localizePage();
}

function startEditingDomainRule(index: number): void {
  editingRuleIndex = index;
  renderDomainRules();
  const input = domainRulesList?.querySelector('.domain-rule-edit-domain') as HTMLInputElement | null;
  input?.focus();
}

function saveDomainRule(index: number): void {
  if (!domainRulesList) return;
  const domainInput = domainRulesList.querySelector('.domain-rule-edit-domain') as HTMLInputElement | null;
  const tagsInput = domainRulesList.querySelector('.domain-rule-edit-tags') as HTMLInputElement | null;
  if (!domainInput || !tagsInput) return;

  const domain = normalizeDomain(domainInput.value);
  const tags = parseTagsInput(tagsInput.value);

  if (!isValidDomain(domainInput.value)) {
    alert(t('invalidDomain'));
    return;
  }
  if (!domain || tags.length === 0) return;

  domainTagRules = domainTagRules.map((rule, i) => (i === index ? { domain, tags } : rule));
  editingRuleIndex = null;
  renderDomainRules();
  markDirty();
}

function addDomainRule(): void {
  if (!domainRuleDomain || !domainRuleTags) return;
  const rawDomain = domainRuleDomain.value;
  if (!isValidDomain(rawDomain)) {
    alert(t('invalidDomain'));
    return;
  }
  const domain = normalizeDomain(rawDomain);
  const tags = parseTagsInput(domainRuleTags.value);
  if (!domain || tags.length === 0) return;
  domainTagRules = [...domainTagRules, { domain, tags }];
  domainRuleDomain.value = '';
  domainRuleTags.value = '';
  renderDomainRules();
  markDirty();
}

function removeDomainRule(index: number): void {
  domainTagRules = domainTagRules.filter((_, i) => i !== index);
  if (editingRuleIndex === index) editingRuleIndex = null;
  renderDomainRules();
  markDirty();
}

function initFooterMetadata(): void {
  const authorEl = document.getElementById('footer-author-name');
  if (authorEl) authorEl.textContent = AUTHOR_NAME;

  const githubLink = document.getElementById('footer-github-link') as HTMLAnchorElement | null;
  if (githubLink) githubLink.href = GITHUB_REPO_URL;

  const emailLink = document.getElementById('footer-email-link') as HTMLAnchorElement | null;
  if (emailLink) emailLink.href = `mailto:${AUTHOR_EMAIL}`;

  const starLink = document.getElementById('support-star-link') as HTMLAnchorElement | null;
  if (starLink) starLink.href = GITHUB_REPO_URL;
}

initFooterMetadata();

export async function loadSettings(): Promise<void> {
  const settings = await getSettings();
  applyTheme(settings.theme);
  $('vault-name').value = settings.vaultName;
  $('base-folder').value = settings.baseFolder;
  $('date-template').value = settings.dateSubfolderTemplate;
  $('date-format').value = settings.dateFormat;
  $('include-selected-text').checked = settings.includeSelectedText;
  $('preserve-images-in-selection').checked = settings.preserveImagesInSelection;
  $('capture-video-progress').checked = settings.captureVideoProgress;
  $('auto-select-first-tag').checked = settings.autoSelectFirstTag;
  $('fm-title').checked = settings.includeFrontmatterTitle;
  $('fm-date').checked = settings.includeFrontmatterDate;
  $('fm-url').checked = settings.includeFrontmatterUrl;
  $('fm-author').checked = settings.includeFrontmatterAuthor;
  $('fm-description').checked = settings.includeFrontmatterDescription;
  $('fm-site').checked = settings.includeFrontmatterSite;
  $('fm-tags').checked = settings.includeFrontmatterTags;
  $('default-tags').value = settings.defaultTags.join(', ');
  $('theme').value = settings.theme;
  domainTagRules = settings.domainTagRules.map((rule) => ({
    domain: rule.domain,
    tags: [...rule.tags],
  }));
  renderDomainRules();
  clearDirty();
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

  const rawTheme = $('theme').value as Theme;
  const theme: Theme = ['light', 'dark', 'auto'].includes(rawTheme) ? rawTheme : 'auto';

  return {
    vaultName: $('vault-name').value.trim(),
    baseFolder: $('base-folder').value.trim(),
    dateSubfolderTemplate: $('date-template').value.trim(),
    dateFormat,
    includeSelectedText: $('include-selected-text').checked,
    preserveImagesInSelection: $('preserve-images-in-selection').checked,
    captureVideoProgress: $('capture-video-progress').checked,
    includeFrontmatterTitle: $('fm-title').checked,
    includeFrontmatterDate: $('fm-date').checked,
    includeFrontmatterUrl: $('fm-url').checked,
    includeFrontmatterAuthor: $('fm-author').checked,
    includeFrontmatterDescription: $('fm-description').checked,
    includeFrontmatterSite: $('fm-site').checked,
    includeFrontmatterTags: $('fm-tags').checked,
    defaultTags: $('default-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
    autoSelectFirstTag: $('auto-select-first-tag').checked,
    domainTagRules: domainTagRules.map((rule) => ({
      domain: rule.domain,
      tags: [...rule.tags],
    })),
    theme,
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

addDomainRuleBtn?.addEventListener('click', addDomainRule);



document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await setSettings(readSettings());
  clearDirty();
  alert(t('settingsSaved'));
});

['vault-name', 'base-folder', 'date-template'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', updateSavePathPreview);
});

const settingsForm = document.getElementById('settings-form');
settingsForm?.addEventListener('input', markDirty);
settingsForm?.addEventListener('change', markDirty);

document.getElementById('theme')?.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement;
  const theme: Theme = ['light', 'dark', 'auto'].includes(target.value)
    ? (target.value as Theme)
    : 'auto';
  applyTheme(theme);
  markDirty();
});

window.addEventListener('beforeunload', (event) => {
  if (!isDirty) return;
  event.preventDefault();
  event.returnValue = t('unsavedChangesWarning');
});

localizePage();
localizePlaceholders();
// Render an initial preview immediately using the default form values,
// then refresh once stored settings are loaded.
updateSavePathPreview();
loadSettings()
  .then(() => {
    updateSavePathPreview();
    // Load the shortcut after settings are rendered so localizePage() calls
    // inside renderDomainRules() do not overwrite the result.
    return loadCurrentShortcut();
  })
  .catch(() => {
    // In non-extension contexts (e.g. local dev server) chrome may be unavailable.
    updateSavePathPreview();
    loadCurrentShortcut().catch(() => {});
  });
