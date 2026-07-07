import { getSettings, getAllDrafts, clearDraft } from '../shared/storage.js';
import { DEFAULT_DRAFT, STORAGE_KEYS } from '../shared/constants.js';
import { mergeSelectedText } from '../shared/draft-utils.js';
import {
  renderTemplate,
  generateFilename,
  buildNoteContent,
  resolveNotePath,
  formatFrontmatterDate,
} from '../shared/templates.js';
import { getLanguage, t, localizePage, localizePlaceholders } from '../shared/i18n.js';
import type { PageInfo, Draft, ExtensionSettings, FrontmatterKey } from '../shared/types.js';

document.documentElement.lang = getLanguage();

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const toggleUrl = document.getElementById('toggle-url') as HTMLInputElement;
const toggleTitle = document.getElementById('toggle-title') as HTMLInputElement;
const targetPathEl = document.getElementById('target-path') as HTMLDivElement;
const targetEditEl = document.getElementById('target-edit') as HTMLDivElement;
const targetFolderInput = document.getElementById('target-folder-input') as HTMLInputElement;
const targetFilenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
const targetEditSave = document.getElementById('target-edit-save') as HTMLButtonElement;
const targetEditCancel = document.getElementById('target-edit-cancel') as HTMLButtonElement;
const charCountEl = document.getElementById('char-count') as HTMLSpanElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const frontmatterHeader = document.getElementById('frontmatter-header') as HTMLDivElement;
const frontmatterBody = document.getElementById('frontmatter-body') as HTMLDivElement;
const frontmatterSummary = document.getElementById('frontmatter-summary') as HTMLSpanElement;

const FM_IDS: FrontmatterKey[] = ['title', 'date', 'url', 'author', 'description', 'site', 'tags'];
const DEFAULT_FM_MAP: Record<FrontmatterKey, keyof ExtensionSettings> = {
  title: 'includeFrontmatterTitle',
  date: 'includeFrontmatterDate',
  url: 'includeFrontmatterUrl',
  author: 'includeFrontmatterAuthor',
  description: 'includeFrontmatterDescription',
  site: 'includeFrontmatterSite',
  tags: 'includeFrontmatterTags',
};
const fmCheckboxes: Record<FrontmatterKey, HTMLInputElement> = {
  title: document.getElementById('fm-title') as HTMLInputElement,
  date: document.getElementById('fm-date') as HTMLInputElement,
  url: document.getElementById('fm-url') as HTMLInputElement,
  author: document.getElementById('fm-author') as HTMLInputElement,
  description: document.getElementById('fm-description') as HTMLInputElement,
  site: document.getElementById('fm-site') as HTMLInputElement,
  tags: document.getElementById('fm-tags') as HTMLInputElement,
};
const fmValues: Record<FrontmatterKey, HTMLSpanElement> = {
  title: document.getElementById('fm-title-value') as HTMLSpanElement,
  date: document.getElementById('fm-date-value') as HTMLSpanElement,
  url: document.getElementById('fm-url-value') as HTMLSpanElement,
  author: document.getElementById('fm-author-value') as HTMLSpanElement,
  description: document.getElementById('fm-description-value') as HTMLSpanElement,
  site: document.getElementById('fm-site-value') as HTMLSpanElement,
  tags: document.getElementById('fm-tags-value') as HTMLSpanElement,
};

let settings: ExtensionSettings;
let pageInfo: PageInfo = {
  url: '',
  title: '',
  selectedText: '',
  author: '',
  description: '',
  site: '',
};
let draft: Draft = { content: '', includeUrl: false, includeTitle: false, targetFolder: '', targetFilename: '' };
let currentTabId: number | undefined;
let allDrafts: Record<number, Draft> = {};

export async function init(): Promise<void> {
  settings = await getSettings();
  allDrafts = await getAllDrafts();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id;

  if (!currentTabId) {
    statusEl.textContent = t('cannotGetCurrentTab');
    statusEl.className = 'error';
    return;
  }

  draft = { ...DEFAULT_DRAFT, ...(allDrafts[currentTabId] ?? {}) };

  if (currentTabId) {
    try {
      pageInfo = await chrome.tabs.sendMessage(currentTabId, { type: 'GET_PAGE_INFO' });
    } catch {
      pageInfo = {
        url: tab.url || '',
        title: tab.title || '',
        selectedText: '',
        author: '',
        description: '',
        site: '',
      };
    }
  }

  const selectedText = settings.includeSelectedText
    ? (settings.preserveImagesInSelection
        ? (pageInfo.selectedContent ?? pageInfo.selectedText)
        : pageInfo.selectedText)
    : '';
  editor.value = mergeSelectedText(draft.content, selectedText);
  toggleTitle.checked = draft.includeTitle;
  toggleUrl.checked = draft.includeTitle ? false : draft.includeUrl;

  editor.focus();

  updateTargetPath();
  updateCharCount();
  autoResizeTextarea();
  renderFrontmatter();
  localizePage();
  localizePlaceholders();

  // Persist the initial state immediately so it survives if the user closes the
  // popup before init() finishes or without typing anything.
  saveDraft();
}

export function getComputedFolder(date = new Date()): string {
  const dateSubfolder = renderTemplate(settings.dateSubfolderTemplate, date);
  return [settings.baseFolder, dateSubfolder].filter(Boolean).join('/');
}

export function getComputedFilename(date = new Date()): string {
  return generateFilename(
    editor.value,
    pageInfo,
    toggleTitle.checked,
    toggleUrl.checked,
    date,
  );
}

export function getCurrentDraft(): Draft {
  return {
    content: editor.value,
    includeUrl: toggleUrl.checked,
    includeTitle: toggleTitle.checked,
    targetFolder: draft.targetFolder,
    targetFilename: draft.targetFilename,
    frontmatterOverrides: draft.frontmatterOverrides,
  };
}

export function getFrontmatterConfig(): Record<FrontmatterKey, boolean> {
  return {
    title: draft.frontmatterOverrides?.title ?? settings.includeFrontmatterTitle,
    date: draft.frontmatterOverrides?.date ?? settings.includeFrontmatterDate,
    url: draft.frontmatterOverrides?.url ?? settings.includeFrontmatterUrl,
    author: draft.frontmatterOverrides?.author ?? settings.includeFrontmatterAuthor,
    description: draft.frontmatterOverrides?.description ?? settings.includeFrontmatterDescription,
    site: draft.frontmatterOverrides?.site ?? settings.includeFrontmatterSite,
    tags: draft.frontmatterOverrides?.tags ?? settings.includeFrontmatterTags,
  };
}

export function getFrontmatterValue(key: FrontmatterKey, date = new Date()): string {
  switch (key) {
    case 'title':
      return pageInfo.title || '';
    case 'date':
      return formatFrontmatterDate(date, settings.dateFormat).value;
    case 'url':
      return pageInfo.url || '';
    case 'author':
      return pageInfo.author || '';
    case 'description':
      return pageInfo.description || '';
    case 'site':
      return pageInfo.site || '';
    case 'tags':
      return settings.defaultTags.join(', ');
    default:
      return '';
  }
}

export function renderFrontmatter(): void {
  const config = getFrontmatterConfig();
  const enabledKeys = FM_IDS.filter((key) => config[key]);
  frontmatterSummary.textContent = enabledKeys.length > 0 ? enabledKeys.join(', ') : t('none');

  FM_IDS.forEach((key) => {
    fmCheckboxes[key].checked = config[key];
    const value = getFrontmatterValue(key);
    fmValues[key].textContent = value || '—';
  });
}

export function toggleFrontmatterBody(): void {
  frontmatterBody.classList.toggle('visible');
}

function saveFrontmatterOverride(key: FrontmatterKey, value: boolean): void {
  const defaultValue = settings[DEFAULT_FM_MAP[key]] as boolean;
  const currentOverrides = { ...draft.frontmatterOverrides };
  if (value === defaultValue) {
    delete currentOverrides[key];
  } else {
    currentOverrides[key] = value;
  }
  draft = { ...draft, frontmatterOverrides: currentOverrides };
  saveDraft();
}

export function updateTargetPath(): void {
  const currentDraft = getCurrentDraft();
  const date = new Date();
  const folder = currentDraft.targetFolder || getComputedFolder(date);
  const filename = currentDraft.targetFilename || getComputedFilename(date);
  const path = resolveNotePath(folder, filename);
  targetPathEl.textContent = t('saveToPrefix') + path;
}

export function updateCharCount(): void {
  charCountEl.textContent = `${editor.value.length} ${t('charCount')}`;
}

const DEFAULT_TEXTAREA_HEIGHT = 160;
const MAX_TEXTAREA_HEIGHT = 340;

export function autoResizeTextarea(): void {
  editor.style.height = 'auto';
  const newHeight = Math.max(
    DEFAULT_TEXTAREA_HEIGHT,
    Math.min(editor.scrollHeight, MAX_TEXTAREA_HEIGHT),
  );
  editor.style.height = `${newHeight}px`;
}

export function saveDraft(): void {
  if (!currentTabId || typeof chrome === 'undefined') return;
  draft = getCurrentDraft();
  allDrafts = { ...allDrafts, [currentTabId]: draft };
  chrome.storage.local.set({ [STORAGE_KEYS.drafts]: allDrafts });
}

async function triggerFallback(filename: string, content: string, errorMessage: string): Promise<void> {
  statusEl.textContent = t('saveFailedDownloading', { error: errorMessage });
  statusEl.className = 'error';
  try {
    const downloadResult = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_NOTE',
      filename: filename + '.md',
      content,
    });
    if (downloadResult?.ok) {
      statusEl.textContent = t('saveFailedDownloaded', { error: errorMessage });
    } else {
      statusEl.textContent = t('saveFailedDownloadFailed', {
        error: errorMessage,
        downloadError: downloadResult?.error ?? t('unknownError'),
      });
    }
  } catch (downloadErr) {
    const downloadMessage = downloadErr instanceof Error ? downloadErr.message : t('unknownError');
    statusEl.textContent = t('saveFailedDownloadFailed', {
      error: errorMessage,
      downloadError: downloadMessage,
    });
  }
}

export function buildObsidianUrl(
  vault: string,
  file: string,
  useClipboard: boolean,
  content: string,
): string {
  let url = `obsidian://new?file=${encodeURIComponent(file)}`;
  if (vault) {
    url += `&vault=${encodeURIComponent(vault)}`;
  }
  if (useClipboard) {
    url += '&clipboard';
  } else {
    url += `&content=${encodeURIComponent(content)}`;
  }
  return url;
}

async function copyToClipboard(tabId: number, text: string): Promise<boolean> {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'COPY_TO_CLIPBOARD', text });
    return result?.success ?? false;
  } catch {
    return false;
  }
}

export async function handleSave(): Promise<void> {
  if (!currentTabId) {
    statusEl.textContent = t('cannotGetCurrentTab');
    statusEl.className = 'error';
    return;
  }

  if (!settings.vaultName) {
    statusEl.textContent = t('pleaseSetVaultName');
    statusEl.className = 'error';
    return;
  }

  if (!editor.value.trim()) {
    if (!window.confirm(t('confirmSaveEmptyNote'))) {
      statusEl.textContent = t('saveCancelled');
      statusEl.className = '';
      return;
    }
  }

  statusEl.textContent = t('saving');
  statusEl.className = '';

  const currentDraft = getCurrentDraft();
  const date = new Date();
  const folder = currentDraft.targetFolder || getComputedFolder(date);
  const filename = currentDraft.targetFilename || getComputedFilename(date);
  const path = resolveNotePath(folder, filename);
  const content = buildNoteContent(editor.value, pageInfo, currentDraft, settings, date);
  const fileWithoutExt = path.replace(/\.md$/, '');

  const clipboardSuccess = await copyToClipboard(currentTabId, content);
  const obsidianUrl = buildObsidianUrl(settings.vaultName, fileWithoutExt, clipboardSuccess, content);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'OPEN_OBSIDIAN_URL',
      url: obsidianUrl,
    });

    if (result?.ok) {
      await clearDraft(currentTabId);
      editor.value = '';
      // Fully reset to the default draft so the next popup shows the default title-based filename.
      draft = { ...DEFAULT_DRAFT };
      allDrafts = { ...allDrafts };
      delete allDrafts[currentTabId];
      toggleTitle.checked = draft.includeTitle;
      toggleUrl.checked = draft.includeTitle ? false : draft.includeUrl;
      statusEl.textContent = t('savedToObsidian');
      statusEl.className = 'success';
      updateTargetPath();
    } else {
      await triggerFallback(filename, content, result?.error ?? t('unknownError'));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : t('messageChannelFailed');
    await triggerFallback(filename, content, message);
  }
}

export function openTargetEdit(): void {
  const currentDraft = getCurrentDraft();
  const date = new Date();
  targetFolderInput.value = currentDraft.targetFolder || getComputedFolder(date);
  // Only show the override value if the user has actually set one.
  // Leave the input empty (with placeholder) when falling back to auto-generation,
  // so clearing the field naturally restores automatic filenames.
  targetFilenameInput.value = currentDraft.targetFilename;
  targetFilenameInput.placeholder = getComputedFilename(date);
  targetEditEl.classList.add('visible');
}

export function closeTargetEdit(): void {
  targetEditEl.classList.remove('visible');
}

function normalizeFilenameInput(value: string): string {
  return value.trim().replace(/\.md$/i, '');
}

function guessToggleStateFromFilename(filename: string, date = new Date()): {
  includeTitle: boolean;
  includeUrl: boolean;
} {
  const normalized = normalizeFilenameInput(filename);
  if (!normalized) {
    return { includeTitle: toggleTitle.checked, includeUrl: toggleUrl.checked };
  }

  const titleName = generateFilename(editor.value, pageInfo, true, false, date);
  const urlName = generateFilename(editor.value, pageInfo, false, true, date);

  if (normalized === titleName) {
    return { includeTitle: true, includeUrl: false };
  }
  if (normalized === urlName) {
    return { includeTitle: false, includeUrl: true };
  }
  return { includeTitle: false, includeUrl: false };
}

export function saveTargetEdit(): void {
  if (!currentTabId) return;

  const rawFilename = targetFilenameInput.value.trim();
  const date = new Date();
  const { includeTitle, includeUrl } = guessToggleStateFromFilename(rawFilename, date);

  toggleTitle.checked = includeTitle;
  toggleUrl.checked = includeUrl;

  draft = {
    ...getCurrentDraft(),
    targetFolder: targetFolderInput.value.trim(),
    // Empty filename means "fall back to auto-generated filename".
    targetFilename: rawFilename,
  };
  saveDraft();
  updateTargetPath();
  closeTargetEdit();
}

editor.addEventListener('input', () => {
  updateCharCount();
  autoResizeTextarea();
  saveDraft();
});
toggleTitle.addEventListener('change', () => {
  if (toggleTitle.checked) {
    toggleUrl.checked = false;
  }
  // Clear any manual filename override so the toggle takes effect immediately.
  draft = { ...getCurrentDraft(), targetFilename: '' };
  // If the user is currently editing the target filename, sync it back to the auto-generated one.
  if (targetEditEl.classList.contains('visible')) {
    targetFilenameInput.value = getComputedFilename();
  }
  updateTargetPath();
  saveDraft();
});

toggleUrl.addEventListener('change', () => {
  if (toggleUrl.checked) {
    toggleTitle.checked = false;
  }
  // Clear any manual filename override so the toggle takes effect immediately.
  draft = { ...getCurrentDraft(), targetFilename: '' };
  // If the user is currently editing the target filename, sync it back to the auto-generated one.
  if (targetEditEl.classList.contains('visible')) {
    targetFilenameInput.value = getComputedFilename();
  }
  updateTargetPath();
  saveDraft();
});
saveBtn.addEventListener('click', handleSave);
targetPathEl.addEventListener('click', openTargetEdit);
targetEditSave.addEventListener('click', saveTargetEdit);
targetEditCancel.addEventListener('click', closeTargetEdit);

// Defensive save before the popup closes so the latest draft is persisted even if
// an async input handler was interrupted.
window.addEventListener('beforeunload', () => {
  saveDraft();
});

frontmatterHeader.addEventListener('click', toggleFrontmatterBody);

FM_IDS.forEach((key) => {
  fmCheckboxes[key].addEventListener('change', () => {
    saveFrontmatterOverride(key, fmCheckboxes[key].checked);
    renderFrontmatter();
  });
});

init();
