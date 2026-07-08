import { describe, it, expect, beforeEach, vi } from 'vitest';

type ContentModule = typeof import('../../src/content/content.js');

const mockWriteText = vi.fn();

async function loadContent(): Promise<ContentModule> {
  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
  });
  Object.assign(navigator, {
    clipboard: {
      writeText: mockWriteText,
    },
  });
  vi.resetModules();
  return import('../../src/content/content.js');
}

describe('content helpers', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockWriteText.mockReset();
    document.title = 'Test Page Title';
    window.history.pushState({}, '', '/test-path?query=1');
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getPageInfo', () => {
    it('returns url, title, and empty selectedText', async () => {
      const { getPageInfo } = await loadContent();
      const info = getPageInfo();
      expect(info.url).toContain('/test-path?query=1');
      expect(info.title).toBe('Test Page Title');
      expect(info.selectedText).toBe('');
      expect(info.author).toBe('');
      expect(info.description).toBe('');
      expect(info.site).toBe('localhost');
    });

    it('returns selected text when present', async () => {
      const { getPageInfo } = await loadContent();
      const p = document.createElement('p');
      p.textContent = 'highlighted text';
      document.body.appendChild(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const info = getPageInfo();
      expect(info.selectedText).toBe('highlighted text');

      document.body.removeChild(p);
    });

    it('extracts author, description, and site from meta tags', async () => {
      const { getPageInfo } = await loadContent();
      const head = document.head;

      const authorMeta = document.createElement('meta');
      authorMeta.setAttribute('name', 'author');
      authorMeta.setAttribute('content', 'John Doe');
      head.appendChild(authorMeta);

      const descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      descMeta.setAttribute('content', 'A test page');
      head.appendChild(descMeta);

      const siteMeta = document.createElement('meta');
      siteMeta.setAttribute('property', 'og:site_name');
      siteMeta.setAttribute('content', 'Example Site');
      head.appendChild(siteMeta);

      const info = getPageInfo();
      expect(info.author).toBe('John Doe');
      expect(info.description).toBe('A test page');
      expect(info.site).toBe('Example Site');

      head.removeChild(authorMeta);
      head.removeChild(descMeta);
      head.removeChild(siteMeta);
    });

    it('extracts author from JSON-LD', async () => {
      const { getPageInfo } = await loadContent();
      const head = document.head;

      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.textContent = JSON.stringify({
        '@type': 'Article',
        headline: 'JSON-LD Article',
        author: { '@type': 'Person', name: 'Jane Smith' },
      });
      head.appendChild(script);

      const info = getPageInfo();
      expect(info.author).toBe('Jane Smith');

      head.removeChild(script);
    });

    it('extracts author from rel="author" link', async () => {
      const { getPageInfo } = await loadContent();
      const body = document.body;

      const h1 = document.createElement('h1');
      h1.textContent = 'Article Title';
      body.appendChild(h1);

      const byline = document.createElement('div');
      const authorLink = document.createElement('a');
      authorLink.setAttribute('rel', 'author');
      authorLink.textContent = 'Rel Author';
      byline.appendChild(authorLink);
      body.appendChild(byline);

      const info = getPageInfo();
      expect(info.author).toBe('Rel Author');

      body.removeChild(h1);
      body.removeChild(byline);
    });

    it('extracts Chinese author near date-adjacent byline', async () => {
      const { getPageInfo } = await loadContent();
      const body = document.body;

      const h1 = document.createElement('h1');
      h1.textContent = '中文文章标题';
      body.appendChild(h1);

      const metaDiv = document.createElement('div');
      const dateSpan = document.createElement('span');
      dateSpan.textContent = '2025年02月26日';
      const authorLink = document.createElement('a');
      authorLink.textContent = '程序员的勇敢';
      metaDiv.appendChild(dateSpan);
      metaDiv.appendChild(authorLink);
      body.appendChild(metaDiv);

      const info = getPageInfo();
      expect(info.author).toBe('程序员的勇敢');

      body.removeChild(h1);
      body.removeChild(metaDiv);
    });

    it('cleans site name from title', async () => {
      const { getPageInfo } = await loadContent();
      const head = document.head;

      const siteMeta = document.createElement('meta');
      siteMeta.setAttribute('property', 'og:site_name');
      siteMeta.setAttribute('content', 'Example Site');
      head.appendChild(siteMeta);

      document.title = 'Great Article | Example Site';

      const info = getPageInfo();
      expect(info.title).toBe('Great Article');

      head.removeChild(siteMeta);
    });
  });

  describe('copyTextToClipboard', () => {
    it('uses navigator.clipboard.writeText when available', async () => {
      const { copyTextToClipboard } = await loadContent();
      mockWriteText.mockResolvedValue(undefined);

      const success = await copyTextToClipboard('hello');

      expect(success).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('hello');
    });

    it('falls back to execCommand when clipboard API fails', async () => {
      const { copyTextToClipboard } = await loadContent();
      mockWriteText.mockRejectedValue(new Error('denied'));
      const execCommandSpy = vi.fn(() => true);
      vi.stubGlobal('document', {
        ...document,
        execCommand: execCommandSpy,
        body: document.body,
        createElement: document.createElement.bind(document),
      });

      const success = await copyTextToClipboard('fallback');

      expect(success).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
    });
  });

  describe('extractSelectedContent', () => {
    it('returns empty string when there is no selection', async () => {
      const { extractSelectedContent } = await loadContent();
      expect(extractSelectedContent(window.getSelection())).toBe('');
    });

    it('returns plain text for a text-only selection', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.textContent = 'hello world';
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('hello world');
      document.body.removeChild(p);
    });

    it('returns markdown image when only an image is selected', async () => {
      const { extractSelectedContent } = await loadContent();
      const img = document.createElement('img');
      img.src = 'https://example.com/chart.png';
      img.alt = 'data chart';
      img.width = 200;
      img.height = 200;
      document.body.appendChild(img);

      const range = document.createRange();
      range.selectNode(img);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('![data chart](https://example.com/chart.png)');
      document.body.removeChild(img);
    });

    it('inserts image markdown at the correct position within text', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('before '));
      const img = document.createElement('img');
      img.src = 'https://example.com/img.png';
      img.alt = 'inline';
      img.width = 100;
      img.height = 100;
      p.appendChild(img);
      p.appendChild(document.createTextNode(' after'));
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('before ![inline](https://example.com/img.png) after');
      document.body.removeChild(p);
    });

    it('filters out images smaller than 20x20', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('text '));
      const img = document.createElement('img');
      img.src = 'https://example.com/pixel.png';
      img.width = 1;
      img.height = 1;
      p.appendChild(img);
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('text');
      document.body.removeChild(p);
    });

    it('prefers data-src over src for lazy-loaded images', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = 'placeholder.png';
      img.dataset.src = 'https://example.com/lazy.png';
      img.alt = 'lazy';
      img.width = 100;
      img.height = 100;
      p.appendChild(img);
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('![lazy](https://example.com/lazy.png)');
      document.body.removeChild(p);
    });

    it('converts relative image urls to absolute', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.src = '/assets/photo.jpg';
      img.alt = 'photo';
      img.width = 100;
      img.height = 100;
      p.appendChild(img);
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toContain('http://localhost:');
      expect(extractSelectedContent(selection)).toContain('/assets/photo.jpg');
      document.body.removeChild(p);
    });

    it('skips images without a usable src', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('text '));
      const img = document.createElement('img');
      img.alt = 'no src';
      img.width = 100;
      img.height = 100;
      p.appendChild(img);
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('text');
      document.body.removeChild(p);
    });

    it('separates multiple paragraphs with blank lines', async () => {
      const { extractSelectedContent } = await loadContent();
      const article = document.createElement('article');
      const p1 = document.createElement('p');
      p1.textContent = 'first paragraph';
      const p2 = document.createElement('p');
      p2.textContent = 'second paragraph';
      article.appendChild(p1);
      article.appendChild(p2);
      document.body.appendChild(article);

      const range = document.createRange();
      range.selectNodeContents(article);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('first paragraph\n\nsecond paragraph');
      document.body.removeChild(article);
    });

    it('does not add excessive blank lines around nested wrapper divs', async () => {
      const { extractSelectedContent } = await loadContent();
      const wrapper = document.createElement('div');
      wrapper.className = 'comment-wrapper';
      const inner = document.createElement('div');
      inner.className = 'comment-content';
      const p1 = document.createElement('p');
      p1.textContent = 'line one';
      const p2 = document.createElement('p');
      p2.textContent = 'line two';
      inner.appendChild(p1);
      inner.appendChild(p2);
      wrapper.appendChild(inner);
      document.body.appendChild(wrapper);

      const range = document.createRange();
      range.selectNodeContents(wrapper);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('line one\n\nline two');
      document.body.removeChild(wrapper);
    });

    it('preserves line breaks from <br> tags', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('line one'));
      p.appendChild(document.createElement('br'));
      p.appendChild(document.createTextNode('line two'));
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('line one\nline two');
      document.body.removeChild(p);
    });

    it('skips blob url images', async () => {
      const { extractSelectedContent } = await loadContent();
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('text '));
      const img = document.createElement('img');
      img.src = 'blob:https://example.com/abc123';
      img.alt = 'blob';
      img.width = 100;
      img.height = 100;
      p.appendChild(img);
      document.body.appendChild(p);

      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(extractSelectedContent(selection)).toBe('text');
      document.body.removeChild(p);
    });
  });

  describe('message listener', () => {
    it('registers a message listener on chrome.runtime.onMessage', async () => {
      await loadContent();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    it('handles COPY_TO_CLIPBOARD message', async () => {
      await loadContent();
      mockWriteText.mockResolvedValue(undefined);
      const addListener = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>);
      const listener = addListener.mock.calls[0][0];
      const sendResponse = vi.fn();

      const handled = listener(
        { type: 'COPY_TO_CLIPBOARD', text: 'copy me' },
        {},
        sendResponse,
      );

      expect(handled).toBe(true);
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('extractVideoProgress', () => {
    it('returns null when there is no video element', async () => {
      const { extractVideoProgress } = await loadContent();
      expect(extractVideoProgress()).toBeNull();
    });

    it('returns null when the only video is paused', async () => {
      const { extractVideoProgress } = await loadContent();
      const video = createTestVideo({ currentTime: 272, duration: 754, paused: true });
      document.body.appendChild(video);

      expect(extractVideoProgress()).toBeNull();

      document.body.removeChild(video);
    });

    it('returns progress for a playing video', async () => {
      const { extractVideoProgress } = await loadContent();
      document.title = 'Test Video Title';
      const video = createTestVideo({ currentTime: 272, duration: 754, paused: false });
      document.body.appendChild(video);

      const progress = extractVideoProgress();

      expect(progress).not.toBeNull();
      expect(progress?.currentTime).toBe('00:04:32');
      expect(progress?.duration).toBe('00:12:34');
      expect(progress?.title).toBe('Test Video Title');
      expect(progress?.link).toBeDefined();

      document.body.removeChild(video);
    });

    it('picks the largest visible playing video when multiple exist', async () => {
      const { extractVideoProgress } = await loadContent();
      document.title = 'Main Video';
      const small = createTestVideo({
        currentTime: 10,
        duration: 100,
        paused: false,
        width: 200,
        height: 150,
      });
      const large = createTestVideo({
        currentTime: 272,
        duration: 754,
        paused: false,
        width: 1280,
        height: 720,
      });
      document.body.appendChild(small);
      document.body.appendChild(large);

      const progress = extractVideoProgress();

      expect(progress?.currentTime).toBe('00:04:32');
      document.body.removeChild(small);
      document.body.removeChild(large);
    });
  });

  describe('getPageInfo with video', () => {
    it('includes videoProgress when a video is playing', async () => {
      const { getPageInfo } = await loadContent();
      document.title = 'Video Page';
      const video = createTestVideo({ currentTime: 60, duration: 120, paused: false });
      document.body.appendChild(video);

      const info = getPageInfo();

      expect(info.videoProgress).toBeDefined();
      expect(info.videoProgress?.currentTime).toBe('00:01:00');

      document.body.removeChild(video);
    });
  });
});

function createTestVideo(options: {
  currentTime: number;
  duration: number;
  paused: boolean;
  width?: number;
  height?: number;
}): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', {
    value: options.currentTime,
    configurable: true,
  });
  Object.defineProperty(video, 'duration', {
    value: options.duration,
    configurable: true,
  });
  Object.defineProperty(video, 'paused', {
    value: options.paused,
    configurable: true,
  });
  Object.defineProperty(video, 'ended', {
    value: false,
    configurable: true,
  });
  Object.defineProperty(video, 'videoWidth', {
    value: options.width ?? 640,
    configurable: true,
  });
  Object.defineProperty(video, 'videoHeight', {
    value: options.height ?? 360,
    configurable: true,
  });
  return video;
}
