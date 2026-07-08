import { t } from '../shared/i18n.js';
import { removeDraft } from '../shared/storage.js';
import { CONTEXT_MENU_ITEM_ID, EXTENSION_NAME } from '../shared/constants.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ITEM_ID,
    title: EXTENSION_NAME,
    contexts: ['page', 'selection', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === CONTEXT_MENU_ITEM_ID) {
    try {
      chrome.action.openPopup();
    } catch {
      // Fallback for older Chrome versions: open popup.html in a small window.
      chrome.windows.create({
        url: chrome.runtime.getURL('src/popup/popup.html'),
        type: 'popup',
        width: 420,
        height: 620,
      });
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeDraft(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url?.startsWith('http')) {
    await removeDraft(tabId);
  }
});

export function downloadMarkdownFile(filename: string, content: string): Promise<number> {
  const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      },
    );
  });
}

export async function openObsidianUrl(url: string): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab?.id) {
    throw new Error(t('cannotGetCurrentTab'));
  }
  await chrome.tabs.update(currentTab.id, { url });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'DOWNLOAD_NOTE') {
    downloadMarkdownFile(request.filename, request.content)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: (err as Error).message }));
    return true;
  }
  if (request.type === 'OPEN_OBSIDIAN_URL') {
    openObsidianUrl(request.url)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: (err as Error).message }));
    return true;
  }
  return false;
});
