import type { PageInfo } from '../shared/types.js';

function getMetaContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.getAttribute('content') ?? '';
}

function getTextContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.textContent?.trim() ?? '';
}

function extractJsonLdAuthor(): string {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        const author = item.author;
        if (typeof author === 'string' && author) return author;
        if (author?.name) return author.name;
        if (Array.isArray(author) && author[0]?.name) return author[0].name;
        if (Array.isArray(author) && typeof author[0] === 'string') return author[0];
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return '';
}

function extractAuthor(): string {
  return (
    getMetaContent('meta[name="author"]') ||
    getMetaContent('meta[property="article:author"]') ||
    getMetaContent('meta[name="twitter:creator"]') ||
    getMetaContent('meta[property="twitter:creator"]') ||
    extractJsonLdAuthor() ||
    getTextContent('[rel="author"]') ||
    getTextContent('.author') ||
    getTextContent('.post-author') ||
    getTextContent('.article-author') ||
    getTextContent('.user-name') ||
    getTextContent('.username') ||
    getTextContent('.creator-name') ||
    ''
  );
}

function extractDescription(): string {
  const fromMeta =
    getMetaContent('meta[name="description"]') ||
    getMetaContent('meta[property="og:description"]') ||
    getMetaContent('meta[property="twitter:description"]') ||
    getMetaContent('meta[name="twitter:description"]');
  if (fromMeta) return fromMeta;

  // Fallback: first meaningful paragraph text, limited to ~200 chars.
  const paragraphs = Array.from(document.querySelectorAll('article p, main p, .post-content p, .article-content p'));
  for (const p of paragraphs) {
    const text = p.textContent?.trim() ?? '';
    if (text.length > 40) {
      return text.slice(0, 200).trim();
    }
  }
  return '';
}

function extractSite(): string {
  return (
    getMetaContent('meta[property="og:site_name"]') ||
    getMetaContent('meta[name="application-name"]') ||
    getMetaContent('meta[name="apple-mobile-web-app-title"]') ||
    document.domain ||
    (() => {
      try {
        return new URL(window.location.href).hostname;
      } catch {
        return '';
      }
    })() ||
    ''
  );
}

export function getPageInfo(): PageInfo {
  const selection = window.getSelection()?.toString() ?? '';

  return {
    url: window.location.href,
    title: document.title,
    selectedText: selection,
    author: extractAuthor(),
    description: extractDescription(),
    site: extractSite(),
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
