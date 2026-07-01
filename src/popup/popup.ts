import { getSettings, getDraft, setDraft, clearDraft } from '../shared/storage.js';
import {
  renderTemplate,
  generateFilename,
  buildNoteContent,
  resolveNotePath,
} from '../shared/templates.js';
import type { PageInfo, MediaInfo, Draft, ExtensionSettings } from '../shared/types.js';

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const toggleUrl = document.getElementById('toggle-url') as HTMLInputElement;
const toggleTitle = document.getElementById('toggle-title') as HTMLInputElement;
const toggleMedia = document.getElementById('toggle-media') as HTMLInputElement;
const targetPathEl = document.getElementById('target-path') as HTMLDivElement;
const charCountEl = document.getElementById('char-count') as HTMLSpanElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

let settings: ExtensionSettings;
let pageInfo: PageInfo = { url: '', title: '', selectedText: '' };
let mediaInfo: MediaInfo | undefined;
let draft: Draft = { content: '', includeUrl: false, includeTitle: false, includeMedia: false, targetFolder: '', targetFilename: '' };

export async function init(): Promise<void> {
  [settings, draft] = await Promise.all([getSettings(), getDraft()]);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
      mediaInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_MEDIA_INFO' });
    } catch {
      pageInfo = { url: tab.url || '', title: tab.title || '', selectedText: '' };
    }
  }

  editor.value = draft.content;
  toggleUrl.checked = draft.includeUrl;
  toggleTitle.checked = draft.includeTitle;
  toggleMedia.checked = draft.includeMedia;

  updateTargetPath();
  updateCharCount();
}

export function getCurrentDraft(): Draft {
  return {
    content: editor.value,
    includeUrl: toggleUrl.checked,
    includeTitle: toggleTitle.checked,
    includeMedia: toggleMedia.checked,
    targetFolder: draft.targetFolder || settings.baseFolder,
    targetFilename: draft.targetFilename,
  };
}

export function updateTargetPath(): void {
  const currentDraft = getCurrentDraft();
  const date = new Date();
  const dateSubfolder = renderTemplate(settings.dateSubfolderTemplate, date);
  const filename = generateFilename(
    editor.value,
    pageInfo,
    currentDraft.includeTitle,
    currentDraft.includeUrl,
  );
  const path = resolveNotePath(settings.baseFolder, dateSubfolder, filename);
  targetPathEl.textContent = `保存到：${path}`;
}

export function updateCharCount(): void {
  charCountEl.textContent = `${editor.value.length} 字符`;
}

export async function saveDraft(): Promise<void> {
  draft = getCurrentDraft();
  await setDraft(draft);
}

export async function handleSave(): Promise<void> {
  statusEl.textContent = '保存中...';
  statusEl.className = '';

  const currentDraft = getCurrentDraft();
  const date = new Date();
  const dateSubfolder = renderTemplate(settings.dateSubfolderTemplate, date);
  const filename = generateFilename(
    editor.value,
    pageInfo,
    currentDraft.includeTitle,
    currentDraft.includeUrl,
  );
  const path = resolveNotePath(settings.baseFolder, dateSubfolder, filename);
  const content = buildNoteContent(editor.value, pageInfo, mediaInfo, currentDraft, settings);

  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_NOTE',
    payload: { path, content },
    settings,
  });

  if (result.success) {
    await clearDraft();
    editor.value = '';
    statusEl.textContent = '已保存';
    statusEl.className = 'success';
    updateTargetPath();
  } else {
    statusEl.textContent = `保存失败：${result.error}，已下载兜底文件`;
    statusEl.className = 'error';
    await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_NOTE',
      filename: filename + '.md',
      content,
    });
  }
}

editor.addEventListener('input', () => {
  updateCharCount();
  saveDraft();
});
[toggleUrl, toggleTitle, toggleMedia].forEach((el) => {
  el.addEventListener('change', () => {
    updateTargetPath();
    saveDraft();
  });
});
saveBtn.addEventListener('click', handleSave);

init();
