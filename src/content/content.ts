/**
 * Content script for extracting page metadata.
 *
 * The extraction strategy (meta → JSON-LD → DOM → byline heuristics) is inspired
 * by Defuddle, the open-source extraction library used by Obsidian Web Clipper.
 * The implementation here is independent and written from scratch for this extension.
 *
 * @see https://github.com/kepano/defuddle
 */
import type { PageInfo, VideoProgress } from '../shared/types.js';
import { findPlatformRule, cleanVideoTitle } from '../shared/video-platforms.config.js';

function getMetaContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.getAttribute('content') ?? '';
}

function getTextContent(selector: string): string {
  const element = document.querySelector(selector);
  return element?.textContent?.trim() ?? '';
}

function getVisibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('script, style, noscript').forEach((s) => s.remove());
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function cleanAuthorName(name: string): string {
  return name
    .replace(/^by\s+/i, '')
    .replace(/\s*[-–—|]\s*$/g, '')
    .replace(/\(?\s*https?:\/\/\S+\s*\)?/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[\n\r]/g, ' ')
    .trim();
}

function isValidAuthor(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    name.length > 0 &&
    name.length < 100 &&
    lower !== 'author' &&
    lower !== 'authors' &&
    !/^#\{.*\}$/.test(name) &&
    /[\p{L}\p{N}]/u.test(name)
  );
}

function isPlaceholderValue(s: string): boolean {
  if (/[{}]/.test(s) || /^#[a-zA-Z]/.test(s)) return true;
  if (!/[\p{L}\p{N}]/u.test(s)) return true;
  return false;
}

function firstValid(values: Array<string | (() => string)>): string {
  for (const value of values) {
    const v = typeof value === 'function' ? value() : value;
    if (v && !isPlaceholderValue(v)) return v;
  }
  return '';
}

function parseJsonLd(): any[] {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const results: any[] = [];
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (Array.isArray(data)) {
        results.push(...data);
      } else {
        results.push(data);
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return results;
}

function getSchemaProperty(data: any[], path: string): string {
  const keys = path.split('.');
  const values: string[] = [];

  const search = (obj: any, remaining: string[]): void => {
    if (obj == null) return;

    if (remaining.length === 0) {
      if (typeof obj === 'string' && obj) {
        values.push(obj);
      } else if (obj && typeof obj === 'object' && typeof obj.name === 'string' && obj.name) {
        values.push(obj.name);
      }
      return;
    }

    const [key, ...rest] = remaining;

    if (key === '[]' && Array.isArray(obj)) {
      obj.forEach((item) => search(item, rest));
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => search(item, remaining));
      return;
    }

    if (typeof obj === 'object' && key in obj) {
      search(obj[key], rest);
    }
  };

  data.forEach((item) => search(item, keys));

  const unique = [...new Set(values.filter(Boolean))];
  return unique.join(', ');
}

function extractJsonLdAuthor(): string {
  const data = parseJsonLd();
  return (
    getSchemaProperty(data, 'author.name') ||
    getSchemaProperty(data, 'author.[]') ||
    getSchemaProperty(data, 'author') ||
    ''
  );
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
    getSchemaProperty(data, 'WebSite.name') ||
    getSchemaProperty(data, 'copyrightHolder.name') ||
    ''
  );
}

function looksLikeDate(text: string): boolean {
  if (!text) return false;
  return (
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text) ||
    /\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(text) ||
    /\d{4}年\d{1,2}月\d{1,2}/.test(text) ||
    /\d{1,2}月\d{1,2}日/.test(text) ||
    /\d+\s*(分钟|小时|天|周|月|年)前/.test(text) ||
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i.test(text) ||
    /\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(text)
  );
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

  // "By Author Name" pattern — require capitalized start (works for Latin bylines).
  const candidates = [el, ...Array.from(el.querySelectorAll('p, span, address, div'))];
  for (const candidate of candidates) {
    const candidateText = getVisibleText(candidate);
    if (candidateText.length > 0 && candidateText.length < 50) {
      const bylineMatch = candidateText.match(/^By\s+([A-Z].+)$/i);
      if (bylineMatch) {
        const name = cleanAuthorName(bylineMatch[1]);
        if (isValidAuthor(name)) return name;
      }
    }
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
    const children = Array.from(el.querySelectorAll('p, span, div, time'));
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

function getAuthorName(el: Element): string {
  const text = getVisibleText(el);
  if (!text) return '';

  // Author cards often wrap name + role + avatar in one element.
  // Prefer a short child element if it looks like a name.
  const children = Array.from(el.querySelectorAll('span, a, p, div'));
  for (const child of children) {
    const childText = getVisibleText(child);
    if (childText.length >= 2 && childText.length <= 50 && childText !== text) {
      return childText;
    }
  }

  return text.length <= 100 ? text : '';
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
    if (collected.length > 0) return dedupeAuthors(collected).join(', ');
  }

  // Common author selectors, including Chinese site patterns.
  const selectors: { selector: string; maxMatches?: number }[] = [
    { selector: '[itemprop="author"]' },
    { selector: '.author', maxMatches: 3 },
    { selector: '.post-author', maxMatches: 3 },
    { selector: '.article-author', maxMatches: 3 },
    { selector: '.authors a', maxMatches: 3 },
    { selector: 'a[href*="/author/"]', maxMatches: 3 },
    { selector: 'a[href*="/user/"]', maxMatches: 3 },
    { selector: 'a[href*="/u/"]', maxMatches: 3 },
    { selector: 'a[href*="/member/"]', maxMatches: 3 },
    { selector: 'a[href*="/people/"]', maxMatches: 3 },
    { selector: '.user-name', maxMatches: 3 },
    { selector: '.username', maxMatches: 3 },
    { selector: '.author-name', maxMatches: 3 },
    { selector: '.creator-name', maxMatches: 3 },
    { selector: '.nickname', maxMatches: 3 },
    { selector: '.display-name', maxMatches: 3 },
    // Juejin-specific and common Chinese tech blog patterns.
    { selector: '.name', maxMatches: 3 },
    { selector: '.user-info .name', maxMatches: 3 },
    { selector: '.author-info .name', maxMatches: 3 },
    { selector: '.article-meta .name', maxMatches: 3 },
    { selector: '.meta-box .username', maxMatches: 3 },
    { selector: '[data-testid="authorName"]', maxMatches: 3 },
  ];

  for (const { selector, maxMatches } of selectors) {
    const matches = Array.from(document.querySelectorAll(selector));
    if (maxMatches && matches.length > maxMatches) continue;
    matches.forEach((el) => addAuthor(getAuthorName(el)));
  }

  if (collected.length > 0) {
    return dedupeAuthors(collected).join(', ');
  }

  return '';
}

function dedupeAuthors(authors: string[]): string[] {
  const normalized = authors.map((name) => name.trim()).filter(Boolean);
  let unique = [...new Set(normalized)];

  // Remove entries that are superstrings of a shorter entry already present.
  if (unique.length > 1) {
    unique = unique.filter((a) => !unique.some((b) => b !== a && a.includes(b)));
  }

  if (unique.length > 10) {
    unique = unique.slice(0, 10);
  }

  return unique;
}

function extractAuthor(): string {
  // 1. Meta tags.
  const fromMeta = firstValid([
    () => getMetaContent('meta[name="sailthru.author"]'),
    () => getMetaContent('meta[property="article:author"]'),
    () => getMetaContent('meta[property="author"]'),
    () => getMetaContent('meta[name="author"]'),
    () => getMetaContent('meta[name="byl"]'),
    () => getMetaContent('meta[name="authorList"]'),
    () => getMetaContent('meta[name="twitter:creator"]'),
    () => getMetaContent('meta[property="twitter:creator"]'),
  ]);
  if (fromMeta) {
    const cleaned = cleanAuthorString(fromMeta);
    if (cleaned) return cleaned;
  }

  // Research paper conventions.
  let citationAuthors: string[] = [];
  const citationMeta = Array.from(document.querySelectorAll('meta[name="citation_author"]'));
  if (citationMeta.length > 0) {
    citationAuthors = citationMeta
      .map((m) => m.getAttribute('content')?.trim() || '')
      .filter((s) => s && !isPlaceholderValue(s));
  }
  if (citationAuthors.length === 0) {
    citationAuthors = Array.from(document.querySelectorAll('meta[property="dc.creator"]'))
      .map((m) => m.getAttribute('content')?.trim() || '')
      .filter((s) => s && !isPlaceholderValue(s));
  }
  if (citationAuthors.length > 0) {
    const joined = citationAuthors
      .map((s) => {
        if (!s.includes(',')) return s.trim();
        const parts = /(.*),\s(.*)/.exec(s);
        if (parts && parts.length === 3) {
          return `${parts[2]} ${parts[1]}`;
        }
        return s.trim();
      })
      .join(', ');
    const cleaned = cleanAuthorString(joined);
    if (cleaned) return cleaned;
  }

  // 2. JSON-LD / Schema.org.
  const fromJsonLd = extractJsonLdAuthor();
  if (fromJsonLd) {
    const cleaned = cleanAuthorString(fromJsonLd);
    if (cleaned) return cleaned;
  }

  // 3. DOM elements.
  const fromDom = extractDomAuthors();
  if (fromDom) return fromDom;

  // 4. Byline near article heading.
  const fromByline = extractBylineAuthor();
  if (fromByline) return fromByline;

  return '';
}

function cleanAuthorString(s: string): string {
  if (!s) return '';
  s = s.replace(/^by\s+/i, '');
  s = s.replace(/\(?\s*https?:\/\/\S+\s*\)?/gi, '');
  s = s.replace(/,?\s+and\s+/gi, ', ');
  s = s.replace(/\s*[-–—|]\s*$/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  // If result is a comma-separated list, clean and dedupe.
  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && isValidAuthor(p));
  if (parts.length === 0) return '';

  return dedupeAuthors(parts).join(', ');
}

function extractDescription(): string {
  const fromMeta = firstValid([
    () => getMetaContent('meta[name="description"]'),
    () => getMetaContent('meta[property="description"]'),
    () => getMetaContent('meta[property="og:description"]'),
    () => getMetaContent('meta[name="twitter:description"]'),
    () => getMetaContent('meta[property="twitter:description"]'),
    () => getMetaContent('meta[name="sailthru.description"]'),
  ]);
  if (fromMeta) return fromMeta;

  const fromJsonLd = extractJsonLdDescription();
  if (fromJsonLd) return fromJsonLd;

  // Fallback: first meaningful paragraph text, limited to ~200 chars.
  const paragraphs = Array.from(document.querySelectorAll('article p, main p, .post-content p, .article-content p, .entry-content p'));
  for (const p of paragraphs) {
    const text = p.textContent?.trim() ?? '';
    if (text.length > 40) {
      return text.slice(0, 200).trim();
    }
  }
  return '';
}

function extractSite(): string {
  const fromMeta = firstValid([
    () => getMetaContent('meta[property="og:site_name"]'),
    () => getMetaContent('meta[name="og:site_name"]'),
    () => getMetaContent('meta[name="application-name"]'),
    () => getMetaContent('meta[name="apple-mobile-web-app-title"]'),
    () => getMetaContent('meta[name="copyright"]'),
  ]);
  if (fromMeta) return fromMeta;

  const fromJsonLd = extractJsonLdSite();
  if (fromJsonLd) return fromJsonLd;

  const hostname = getHostname();
  return hostname || '';
}

function getHostname(): string {
  try {
    return new URL(window.location.href).hostname.replace(/^www\./, '');
  } catch {
    return document.domain || '';
  }
}

// Only treat semantic block elements as block-level for Markdown conversion.
// Generic containers such as <div>, <section>, <article> are intentionally
// excluded to avoid producing excessive blank lines when sites nest wrappers
// around paragraphs (common in comment sections and component-based UIs).
const BLOCK_TAGS = new Set([
  'BLOCKQUOTE',
  'DD',
  'DT',
  'FIGCAPTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'LI',
  'P',
  'PRE',
  'TD',
  'TH',
]);

function isBlockElement(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName);
}

function getImageSource(img: HTMLImageElement): string {
  return (
    img.dataset.src ||
    img.dataset.lazySrc ||
    img.dataset.original ||
    img.src ||
    ''
  );
}

function resolveImageUrl(src: string): string {
  if (!src) return '';
  // Blob URLs are temporary and will be invalid once the page is closed,
  // so there is no point in preserving them in a note.
  if (/^blob:/i.test(src)) return '';
  if (/^(data:|https?:)/i.test(src)) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

function isVisibleImage(img: HTMLImageElement): boolean {
  const width =
    img.naturalWidth ||
    parseInt(img.getAttribute('width') || '0', 10) ||
    0;
  const height =
    img.naturalHeight ||
    parseInt(img.getAttribute('height') || '0', 10) ||
    0;
  return width >= 20 && height >= 20;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function isVisibleVideo(video: HTMLVideoElement): boolean {
  const width = video.videoWidth || video.clientWidth || 0;
  const height = video.videoHeight || video.clientHeight || 0;
  return width >= 200 && height >= 150;
}

function videoScore(video: HTMLVideoElement): number {
  let score = 0;
  const rect = video.getBoundingClientRect();
  const inViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;
  if (inViewport) score += 100;
  // Prefer intrinsic video dimensions when rendered rect is unavailable.
  const width = rect.width || video.videoWidth || video.clientWidth || 1;
  const height = rect.height || video.videoHeight || video.clientHeight || 1;
  score += (width * height) / 10000;
  if (!video.paused && !video.ended) score += 50;
  return score;
}

function pickMainVideo(videos: HTMLVideoElement[]): HTMLVideoElement | null {
  if (videos.length === 0) return null;
  if (videos.length === 1) return videos[0];

  const candidates = videos.filter(isVisibleVideo);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => videoScore(b) - videoScore(a));
  return candidates[0];
}

function buildTimeJumpLink(pageUrl: string, seconds: number): string {
  const rule = findPlatformRule(pageUrl);
  if (!rule.supportsTimeParam || !rule.timeParam || !rule.formatTime) {
    return pageUrl;
  }

  try {
    const next = new URL(pageUrl);
    next.searchParams.set(rule.timeParam, rule.formatTime(seconds));
    if (rule.autoplayParam) {
      next.searchParams.set(rule.autoplayParam, '0');
    }
    return next.href;
  } catch {
    return pageUrl;
  }
}

export function extractVideoProgress(): VideoProgress | null {
  const videos = Array.from(document.querySelectorAll('video'));
  const candidate = pickMainVideo(videos);
  if (!candidate || candidate.paused || candidate.ended) return null;

  const currentSeconds = Math.floor(candidate.currentTime);
  const durationSeconds = Math.floor(candidate.duration || 0);
  const rule = findPlatformRule(window.location.href);
  const title = cleanVideoTitle(document.title, rule);

  return {
    currentTime: formatDuration(currentSeconds),
    duration: formatDuration(durationSeconds),
    title,
    link: buildTimeJumpLink(window.location.href, currentSeconds),
    platform: rule.name,
  };
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;

    if (el.tagName === 'BR') {
      return '\n';
    }

    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      if (!isVisibleImage(img)) return '';
      const src = resolveImageUrl(getImageSource(img));
      const alt = img.alt || '';
      return src ? `![${alt}](${src})` : '';
    }

    const children = Array.from(el.childNodes)
      .map(nodeToMarkdown)
      .join('');

    if (isBlockElement(el)) {
      const trimmed = children.trim();
      return trimmed ? `\n\n${trimmed}\n\n` : '\n\n';
    }

    return children;
  }

  return '';
}

export function fragmentToMarkdown(fragment: DocumentFragment): string {
  const result = Array.from(fragment.childNodes)
    .map(nodeToMarkdown)
    .join('');
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

export function extractSelectedContent(selection: Selection | null): string {
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  return fragmentToMarkdown(fragment);
}

// Chrome clears the page selection when the user opens the extension popup via
// the right-click context menu. We cache the last non-empty selection so the
// popup can still import the highlighted text in that flow.
let cachedSelectionText = '';
let cachedSelectedContent = '';

function updateCachedSelection(): void {
  const selection = window.getSelection();
  const text = selection?.toString() ?? '';
  if (text) {
    cachedSelectionText = text;
    cachedSelectedContent = extractSelectedContent(selection);
  }
}

function clearCachedSelectionIfEmpty(): void {
  const selection = window.getSelection();
  if (!selection || selection.toString() === '') {
    cachedSelectionText = '';
    cachedSelectedContent = '';
  }
}

document.addEventListener('selectionchange', updateCachedSelection);

// Left-clicking outside a selection intentionally clears it. We clear the cache
// on click (after the browser has removed the selection) rather than on
// mousedown, because the selection may still exist when mousedown fires.
// Right-clicking the context-menu item does not dispatch a page click event, so
// the context-menu flow keeps the cached text available.
document.addEventListener('click', () => {
  clearCachedSelectionIfEmpty();
});

// Keyboard-driven deselect (e.g. Escape) should also drop the cache.
document.addEventListener('keyup', (event) => {
  if (event.key === 'Escape') {
    clearCachedSelectionIfEmpty();
  }
});

function cleanTitle(title: string, siteName: string): string {
  if (!title) return title;

  const separators = '[|\\-–—/·]';

  if (siteName && siteName.toLowerCase() !== title.toLowerCase()) {
    const siteNameEscaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`\\s*${separators}\\s*${siteNameEscaped}\\s*$`, 'i'),
      new RegExp(`^\\s*${siteNameEscaped}\\s*${separators}\\s*`, 'i'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return title.replace(pattern, '').trim();
      }
    }
  }

  // Heuristic fallback: strip short trailing site/brand segments.
  const strongMatch = title.match(/\s+([|/·])\s+/g);
  if (strongMatch) {
    const lastSepIndex = title.lastIndexOf(strongMatch[strongMatch.length - 1]);
    if (lastSepIndex > 0) {
      const left = title.slice(0, lastSepIndex).trim();
      const right = title.slice(lastSepIndex + strongMatch[strongMatch.length - 1].length).trim();
      const leftWords = left.split(/\s+/).length;
      const rightWords = right.split(/\s+/).length;
      if (rightWords <= 3 && leftWords >= 2 && leftWords >= rightWords * 2) {
        return left;
      }
    }
  }

  return title.trim();
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function getBestTitle(): string {
  const siteName = extractSite();

  const candidates = [
    getMetaContent('meta[property="og:title"]'),
    getMetaContent('meta[name="twitter:title"]'),
    getMetaContent('meta[name="title"]'),
    getMetaContent('meta[name="sailthru.title"]'),
    document.title,
    document.querySelector('h1')?.textContent?.trim() || '',
  ].filter((c) => c && !isPlaceholderValue(c));

  if (candidates.length === 0) return '';

  const authorMeta =
    getMetaContent('meta[property="author"]') || getMetaContent('meta[name="author"]');
  const authorNorm = authorMeta.trim().toLowerCase();
  const siteNorm = siteName.trim().toLowerCase();
  const domain = getHostname();
  const domainNorm = domain ? domain.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  const firstNonIdentifier = candidates.find((c) => {
    const norm = c.trim().toLowerCase();
    if (authorNorm && norm === authorNorm) return false;
    if (siteNorm && norm === siteNorm) return false;
    if (domainNorm) {
      const candidateNorm = norm.replace(/[^a-z0-9]/g, '');
      if (candidateNorm === domainNorm) return false;
    }
    return true;
  });

  return cleanTitle(firstNonIdentifier ?? candidates[0], siteName);
}

export function getPageInfo(): PageInfo {
  const selection = window.getSelection();
  const currentText = selection?.toString() ?? '';

  // Prefer the live selection; fall back to the cached selection when the
  // browser has cleared it (e.g. after opening the popup from the context menu).
  const selectedText = currentText || cachedSelectionText;
  const selectedContent = currentText
    ? extractSelectedContent(selection)
    : cachedSelectedContent;

  return {
    url: window.location.href,
    title: getBestTitle(),
    selectedText,
    selectedContent,
    author: extractAuthor(),
    description: extractDescription(),
    site: extractSite(),
    videoProgress: extractVideoProgress(),
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
