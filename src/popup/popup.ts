import { getSettings, getDraft, setDraft, clearDraft } from '../shared/storage.js';
import {
  renderTemplate,
  generateFilename,
  buildNoteContent,
  resolveNotePath,
} from '../shared/templates.js';
import type { PageInfo, Draft, ExtensionSettings } from '../shared/types.js';

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

export async function init(): Promise<void> {
  [settings, draft] = await Promise.all([getSettings(), getDraft()]);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
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

  const selectedText = settings.includeSelectedText ? pageInfo.selectedText : '';
  editor.value = draft.content || selectedText || '';
  toggleTitle.checked = draft.includeTitle;
  toggleUrl.checked = draft.includeTitle ? false : draft.includeUrl;

  editor.focus();

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

async function triggerFallback(filename: string, content: string, errorMessage: string): Promise<void> {
  statusEl.textContent = `保存失败：${errorMessage}，正在下载兜底文件…`;
  statusEl.className = 'error';
  try {
    const downloadResult = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_NOTE',
      filename: filename + '.md',
      content,
    });
    if (downloadResult?.ok) {
      statusEl.textContent = `保存失败：${errorMessage}，已下载兜底文件`;
    } else {
      statusEl.textContent = `保存失败：${errorMessage}；兜底下载也失败：${downloadResult?.error ?? '未知错误'}`;
    }
  } catch (downloadErr) {
    const downloadMessage = downloadErr instanceof Error ? downloadErr.message : '未知错误';
    statusEl.textContent = `保存失败：${errorMessage}；兜底下载也失败：${downloadMessage}`;
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
  if (!settings.vaultName) {
    statusEl.textContent = '请先填写 Obsidian 仓库名（打开设置）';
    statusEl.className = 'error';
    return;
  }

  if (!editor.value.trim()) {
    if (!window.confirm('编辑器为空，确定要保存空笔记吗？')) {
      statusEl.textContent = '已取消保存';
      statusEl.className = '';
      return;
    }
  }

  statusEl.textContent = '保存中…';
  statusEl.className = '';

  const currentDraft = getCurrentDraft();
  const date = new Date();
  const folder = currentDraft.targetFolder || getComputedFolder(date);
  const filename = currentDraft.targetFilename || getComputedFilename(date);
  const path = resolveNotePath(folder, filename);
  const content = buildNoteContent(editor.value, pageInfo, currentDraft, settings, date);
  const fileWithoutExt = path.replace(/\.md$/, '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  if (!tabId) {
    await triggerFallback(filename, content, '无法获取当前标签页');
    return;
  }

  const clipboardSuccess = await copyToClipboard(tabId, content);
  const obsidianUrl = buildObsidianUrl(settings.vaultName, fileWithoutExt, clipboardSuccess, content);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'OPEN_OBSIDIAN_URL',
      url: obsidianUrl,
    });

    if (result?.ok) {
      await clearDraft();
      editor.value = '';
      draft = { ...draft, targetFolder: '', targetFilename: '' };
      statusEl.textContent = '已保存到 Obsidian';
      statusEl.className = 'success';
      updateTargetPath();
    } else {
      await triggerFallback(filename, content, result?.error ?? '未知错误');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '消息通道失败';
    await triggerFallback(filename, content, message);
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
toggleTitle.addEventListener('change', () => {
  if (toggleTitle.checked) {
    toggleUrl.checked = false;
  }
  updateTargetPath();
  saveDraft();
});

toggleUrl.addEventListener('change', () => {
  if (toggleUrl.checked) {
    toggleTitle.checked = false;
  }
  updateTargetPath();
  saveDraft();
});
saveBtn.addEventListener('click', handleSave);
targetPathEl.addEventListener('click', openTargetEdit);
targetEditSave.addEventListener('click', saveTargetEdit);
targetEditCancel.addEventListener('click', closeTargetEdit);

init();
