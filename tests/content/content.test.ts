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
    mockWriteText.mockReset();
    document.title = 'Test Page Title';
    window.history.pushState({}, '', '/test-path?query=1');
    window.getSelection()?.removeAllRanges();
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
});
