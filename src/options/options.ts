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
import type { ExtensionSettings, DateFormat } from '../shared/types.js';

document.documentElement.lang = getLanguage();
document.title = t('optionsTitle');

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

const domainRulesList = document.getElementById('domain-rules-list') as HTMLDivElement | null;
const domainRuleDomain = document.getElementById('domain-rule-domain') as HTMLInputElement | null;
const domainRuleTags = document.getElementById('domain-rule-tags') as HTMLInputElement | null;
const addDomainRuleBtn = document.getElementById('add-domain-rule') as HTMLButtonElement | null;

let domainTagRules: Array<{ domain: string; tags: string[] }> = [];

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseTagsInput(value: string): string[] {
  return value.split(',').map((t) => t.trim()).filter(Boolean);
}

function renderDomainRules(): void {
  if (!domainRulesList) return;
  domainRulesList.innerHTML = '';
  domainTagRules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'domain-rule-item';
    item.innerHTML = `
      <span class="domain-rule-domain">${escapeHtml(rule.domain)}</span>
      <span class="domain-rule-tags">${escapeHtml(rule.tags.join(', '))}</span>
      <button type="button" class="domain-rule-remove" data-index="${index}" data-i18n="removeDomainRule">删除</button>
    `;
    item.querySelector('.domain-rule-remove')?.addEventListener('click', () => removeDomainRule(index));
    domainRulesList.appendChild(item);
  });
  localizePage();
}

function addDomainRule(): void {
  if (!domainRuleDomain || !domainRuleTags) return;
  const domain = domainRuleDomain.value.trim();
  const tags = parseTagsInput(domainRuleTags.value);
  if (!domain || tags.length === 0) return;
  domainTagRules = [...domainTagRules, { domain, tags }];
  domainRuleDomain.value = '';
  domainRuleTags.value = '';
  renderDomainRules();
}

function removeDomainRule(index: number): void {
  domainTagRules = domainTagRules.filter((_, i) => i !== index);
  renderDomainRules();
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
  domainTagRules = settings.domainTagRules.map((rule) => ({
    domain: rule.domain,
    tags: [...rule.tags],
  }));
  renderDomainRules();
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
