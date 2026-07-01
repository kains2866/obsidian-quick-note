import type { PageInfo } from '../shared/types.js';

function getMetaContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.getAttribute('content') ?? '';
}

export function getPageInfo(): PageInfo {
  const selection = window.getSelection()?.toString() ?? '';
  const author =
    getMetaContent('meta[name="author"]') ||
    getMetaContent('meta[property="article:author"]') ||
    '';
  const description =
    getMetaContent('meta[name="description"]') ||
    getMetaContent('meta[property="og:description"]') ||
    '';
  const site =
    getMetaContent('meta[property="og:site_name"]') ||
    document.domain ||
    (() => {
      try {
        return new URL(window.location.href).hostname;
      } catch {
        return '';
      }
    })() ||
    '';

  return {
    url: window.location.href,
    title: document.title,
    selectedText: selection,
    author,
    description,
    site,
  };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or permission issues
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return result;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'GET_PAGE_INFO') {
    sendResponse(getPageInfo());
    return false;
  }
  if (request.type === 'COPY_TO_CLIPBOARD') {
    copyTextToClipboard(request.text).then((success) => {
      sendResponse({ success });
    });
    return true;
  }
  return false;
});
