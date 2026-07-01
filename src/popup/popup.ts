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
const targetEditEl = document.getElementById('target-edit') as HTMLDivElement;
const targetFolderInput = document.getElementById('target-folder-input') as HTMLInputElement;
const targetFilenameInput = document.getElementById('target-filename-input') as HTMLInputElement;
const targetEditSave = document.getElementById('target-edit-save') as HTMLButtonElement;
const targetEditCancel = document.getElementById('target-edit-cancel') as HTMLButtonElement;
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
    includeMedia: toggleMedia.checked,
    targetFolder: draft.targetFolder,
    targetFilename: draft.targetFilename,
  };
}

export function updateTargetPath(): void {
  const currentDraft = getCurrentDraft();
  const date = new Date();
  const folder = currentDraft.targetFolder || getComputedFolder(date);
  const filename = currentDraft.targetFilename || getComputedFilename(date);
  const path = resolveNotePath(folder, filename);
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
  const folder = currentDraft.targetFolder || getComputedFolder(date);
  const filename = currentDraft.targetFilename || getComputedFilename(date);
  const path = resolveNotePath(folder, filename);
  const content = buildNoteContent(editor.value, pageInfo, mediaInfo, currentDraft, settings, date);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'SAVE_NOTE',
      payload: { path, content },
      settings,
    });

    if (result?.success) {
      await clearDraft();
      editor.value = '';
      draft = { ...draft, targetFolder: '', targetFilename: '' };
      statusEl.textContent = '已保存';
      statusEl.className = 'success';
      updateTargetPath();
    } else {
      statusEl.textContent = `保存失败：${result?.error ?? '未知错误'}，已下载兜底文件`;
      statusEl.className = 'error';
      await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_NOTE',
        filename: filename + '.md',
        content,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '消息通道失败';
    statusEl.textContent = `保存失败：${message}，已下载兜底文件`;
    statusEl.className = 'error';
    await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_NOTE',
      filename: filename + '.md',
      content,
    });
  }
}

export function openTargetEdit(): void {
  const currentDraft = getCurrentDraft();
  const date = new Date();
  targetFolderInput.value = currentDraft.targetFolder || getComputedFolder(date);
  targetFilenameInput.value = currentDraft.targetFilename || getComputedFilename(date);
  targetEditEl.classList.add('visible');
}

export function closeTargetEdit(): void {
  targetEditEl.classList.remove('visible');
}

export async function saveTargetEdit(): Promise<void> {
  draft = {
    ...getCurrentDraft(),
    targetFolder: targetFolderInput.value.trim(),
    targetFilename: targetFilenameInput.value.trim(),
  };
  await setDraft(draft);
  updateTargetPath();
  closeTargetEdit();
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
targetPathEl.addEventListener('click', openTargetEdit);
targetEditSave.addEventListener('click', saveTargetEdit);
targetEditCancel.addEventListener('click', closeTargetEdit);

init();
