import type { PageInfo } from '../shared/types.js';

function getMetaContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.getAttribute('content') ?? '';
}

function getTextContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.textContent?.trim() ?? '';
}

function getVisibleText(el: Element): string {
  return el.textContent?.trim() ?? '';
}

function cleanAuthorName(name: string): string {
  return name
    .replace(/^by\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[\n\r]/g, ' ')
    .trim();
}

function isValidAuthor(name: string): boolean {
  const lower = name.toLowerCase();
  return name.length > 0 && name.length < 100 && lower !== 'author' && lower !== 'authors';
}

function parseJsonLd(): any {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      return Array.isArray(data) ? data : [data];
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return [];
}

function getSchemaProperty(data: any[], path: string): string {
  const keys = path.split('.');
  for (const item of data) {
    const value = keys.reduce((obj, key) => {
      if (obj == null) return undefined;
      if (key === '[]' && Array.isArray(obj)) return obj[0];
      return obj[key];
    }, item);
    if (typeof value === 'string' && value) return value;
    if (value && typeof value === 'object' && value.name) return value.name;
  }
  return '';
}

function extractJsonLdAuthor(): string {
  const data = parseJsonLd();
  return getSchemaProperty(data, 'author.name') || getSchemaProperty(data, 'author');
}

function extractJsonLdDescription(): string {
  const data = parseJsonLd();
  return getSchemaProperty(data, 'description');
}

function extractJsonLdSite(): string {
  const data = parseJsonLd();
  return (
    getSchemaProperty(data, 'publisher.name') ||
    getSchemaProperty(data, 'sourceOrganization.name') ||
    getSchemaProperty(data, 'isPartOf.name') ||
    ''
  );
}

function looksLikeDate(text: string): boolean {
  return /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(text);
}

function extractBylineAuthor(): string {
  const h1 = document.querySelector('h1');
  if (!h1) return '';

  // Check siblings of h1 and ancestors (up to 3 levels) for date-adjacent author names.
  let scope: Element | null = h1;
  for (let depth = 0; depth < 3 && scope; depth++) {
    let sibling = scope.nextElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      const result = extractAuthorFromBylineElement(sibling);
      if (result) return result;
      sibling = sibling.nextElementSibling;
    }
    sibling = scope.previousElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      const result = extractAuthorFromBylineElement(sibling);
      if (result) return result;
      sibling = sibling.previousElementSibling;
    }
    scope = scope.parentElement;
  }

  return '';
}

function extractAuthorFromBylineElement(el: Element): string {
  const text = getVisibleText(el);
  if (!text || text.length > 300) return '';

  // "By Author Name" pattern.
  const bylineMatch = text.match(/^By\s+(.+)$/i);
  if (bylineMatch) {
    const name = cleanAuthorName(bylineMatch[1]);
    if (isValidAuthor(name)) return name;
  }

  // Date-adjacent: if the element contains a date, look for a single non-date link/text.
  if (looksLikeDate(text)) {
    const links = Array.from(el.querySelectorAll('a'));
    const nonDateLinks = links.filter((link) => !looksLikeDate(getVisibleText(link)));
    if (nonDateLinks.length === 1) {
      const name = cleanAuthorName(getVisibleText(nonDateLinks[0]));
      if (isValidAuthor(name)) return name;
    }

    // Try direct child paragraphs/spans.
    const children = Array.from(el.querySelectorAll('p, span, div'));
    for (const child of children) {
      const childText = getVisibleText(child);
      if (childText && !looksLikeDate(childText) && childText.length < 100) {
        const name = cleanAuthorName(childText);
        if (isValidAuthor(name)) return name;
      }
    }
  }

  return '';
}

function extractDomAuthors(): string {
  const collected: string[] = [];

  const addAuthor = (value: string | null | undefined) => {
    if (!value) return;
    value.split(',').forEach((part) => {
      const name = cleanAuthorName(part);
      if (isValidAuthor(name)) collected.push(name);
    });
  };

  // rel="author" links/addresses first — most semantic and avoids bio text.
  const relAuthors = Array.from(document.querySelectorAll('a[rel~="author"], address[rel~="author"]'));
  if (relAuthors.length > 0 && relAuthors.length <= 3) {
    relAuthors.forEach((el) => addAuthor(getVisibleText(el)));
    if (collected.length > 0) return [...new Set(collected)].join(', ');
  }

  // Common author selectors with caps to avoid comment/testimonial noise.
  const selectors = [
    { selector: '[itemprop="author"]' },
    { selector: '.author', maxMatches: 3 },
    { selector: '.post-author', maxMatches: 3 },
    { selector: '.article-author', maxMatches: 3 },
    { selector: '.authors a', maxMatches: 3 },
    { selector: 'a[href*="/author/"]', maxMatches: 3 },
    { selector: '.user-name', maxMatches: 3 },
    { selector: '.username', maxMatches: 3 },
    { selector: '.creator-name', maxMatches: 3 },
  ];

  for (const { selector, maxMatches } of selectors) {
    const matches = Array.from(document.querySelectorAll(selector));
    if (maxMatches && matches.length > maxMatches) continue;
    matches.forEach((el) => addAuthor(getVisibleText(el)));
  }

  if (collected.length > 0) {
    return [...new Set(collected)].join(', ');
  }

  return '';
}

function extractAuthor(): string {
  const fromMeta =
    getMetaContent('meta[name="author"]') ||
    getMetaContent('meta[property="article:author"]') ||
    getMetaContent('meta[property="author"]') ||
    getMetaContent('meta[name="byl"]') ||
    getMetaContent('meta[name="twitter:creator"]') ||
    getMetaContent('meta[property="twitter:creator"]');
  if (fromMeta) {
    const cleaned = cleanAuthorName(fromMeta);
    if (isValidAuthor(cleaned)) return cleaned;
  }

  const fromJsonLd = extractJsonLdAuthor();
  if (fromJsonLd) return cleanAuthorName(fromJsonLd);

  const fromDom = extractDomAuthors();
  if (fromDom) return fromDom;

  const fromByline = extractBylineAuthor();
  if (fromByline) return fromByline;

  return '';
}

function extractDescription(): string {
  const fromMeta =
    getMetaContent('meta[name="description"]') ||
    getMetaContent('meta[property="description"]') ||
    getMetaContent('meta[property="og:description"]') ||
    getMetaContent('meta[name="twitter:description"]') ||
    getMetaContent('meta[property="twitter:description"]');
  if (fromMeta) return fromMeta;

  const fromJsonLd = extractJsonLdDescription();
  if (fromJsonLd) return fromJsonLd;

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
    extractJsonLdSite() ||
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
