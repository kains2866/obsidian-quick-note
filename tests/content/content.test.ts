import { describe, it, expect, beforeEach, vi } from 'vitest';

type ContentModule = typeof import('../../src/content/content.js');

async function loadContent(): Promise<ContentModule> {
  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
  });
  vi.resetModules();
  return import('../../src/content/content.js');
}

describe('content helpers', () => {
  describe('formatDuration', () => {
    it('formats seconds to mm:ss', async () => {
      const { formatDuration } = await loadContent();
      expect(formatDuration(204)).toBe('03:24');
    });

    it('formats hours to hh:mm:ss', async () => {
      const { formatDuration } = await loadContent();
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('formats zero as 00:00', async () => {
      const { formatDuration } = await loadContent();
      expect(formatDuration(0)).toBe('00:00');
    });
  });

  describe('getPageInfo', () => {
    beforeEach(() => {
      document.title = 'Test Page Title';
      window.history.pushState({}, '', '/test-path?query=1');
      window.getSelection()?.removeAllRanges();
    });

    it('returns url, title, and empty selectedText', async () => {
      const { getPageInfo } = await loadContent();
      const info = getPageInfo();
      expect(info.url).toContain('/test-path?query=1');
      expect(info.title).toBe('Test Page Title');
      expect(info.selectedText).toBe('');
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
  });

  describe('getMediaInfo', () => {
    beforeEach(() => {
      document.title = 'Media Page Title';
      window.history.pushState({}, '', '/media');
      document.body.innerHTML = '';
    });

    it('returns undefined when no media element exists', async () => {
      const { getMediaInfo } = await loadContent();
      expect(getMediaInfo()).toBeUndefined();
    });

    it('returns undefined when video is paused', async () => {
      const { getMediaInfo } = await loadContent();
      const video = document.createElement('video');
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      Object.defineProperty(video, 'ended', { value: false, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 125, configurable: true });
      document.body.appendChild(video);

      expect(getMediaInfo()).toBeUndefined();

      document.body.removeChild(video);
    });

    it('returns undefined when currentTime is zero', async () => {
      const { getMediaInfo } = await loadContent();
      const video = document.createElement('video');
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      Object.defineProperty(video, 'ended', { value: false, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 0, configurable: true });
      document.body.appendChild(video);

      expect(getMediaInfo()).toBeUndefined();

      document.body.removeChild(video);
    });

    it('returns media info for playing video', async () => {
      const { getMediaInfo } = await loadContent();
      const video = document.createElement('video');
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      Object.defineProperty(video, 'ended', { value: false, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 125, configurable: true });
      document.body.appendChild(video);

      const info = getMediaInfo();
      expect(info).toEqual({
        url: expect.stringContaining('/media'),
        title: 'Media Page Title',
        currentTime: '02:05',
      });

      document.body.removeChild(video);
    });

    it('prefers mediaSession metadata title when available', async () => {
      const metadataTitle = 'Media Session Title';
      Object.defineProperty(navigator, 'mediaSession', {
        value: { metadata: { title: metadataTitle } as MediaMetadata },
        configurable: true,
      });

      const { getMediaInfo } = await loadContent();
      const video = document.createElement('video');
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      Object.defineProperty(video, 'ended', { value: false, configurable: true });
      Object.defineProperty(video, 'currentTime', { value: 3661, configurable: true });
      document.body.appendChild(video);

      const info = getMediaInfo();
      expect(info?.title).toBe(metadataTitle);
      expect(info?.currentTime).toBe('01:01:01');

      document.body.removeChild(video);
      Object.defineProperty(navigator, 'mediaSession', {
        value: undefined,
        configurable: true,
      });
    });
  });

  describe('message listener', () => {
    it('registers a message listener on chrome.runtime.onMessage', async () => {
      await loadContent();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });
  });
});
