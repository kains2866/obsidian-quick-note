import { describe, it, expect } from 'vitest';
import {
  findPlatformRule,
  cleanVideoTitle,
  VIDEO_PLATFORM_RULES,
} from '../../src/shared/video-platforms.config.js';

describe('video-platforms.config', () => {
  describe('findPlatformRule', () => {
    it('matches YouTube by hostname', () => {
      const rule = findPlatformRule('https://www.youtube.com/watch?v=ABC123');
      expect(rule.name).toBe('youtube');
      expect(rule.supportsTimeParam).toBe(true);
      expect(rule.timeParam).toBe('t');
      expect(rule.formatTime?.(272)).toBe('272s');
      expect(rule.autoplayParam).toBe('autoplay');
    });

    it('matches YouTube short links', () => {
      const rule = findPlatformRule('https://youtu.be/ABC123');
      expect(rule.name).toBe('youtube');
    });

    it('matches Bilibili', () => {
      const rule = findPlatformRule('https://www.bilibili.com/video/BV1xx411c7mD');
      expect(rule.name).toBe('bilibili');
      expect(rule.supportsTimeParam).toBe(true);
      expect(rule.formatTime?.(272)).toBe('272');
    });

    it('matches Vimeo', () => {
      const rule = findPlatformRule('https://vimeo.com/123456789');
      expect(rule.name).toBe('vimeo');
      expect(rule.supportsTimeParam).toBe(true);
      expect(rule.formatTime?.(92)).toBe('1m32s');
    });

    it('matches Dailymotion', () => {
      const rule = findPlatformRule('https://www.dailymotion.com/video/x123abc');
      expect(rule.name).toBe('dailymotion');
      expect(rule.supportsTimeParam).toBe(true);
      expect(rule.formatTime?.(272)).toBe('272');
    });

    it('matches Twitch VODs', () => {
      const rule = findPlatformRule('https://www.twitch.tv/videos/123456789');
      expect(rule.name).toBe('twitch');
      expect(rule.supportsTimeParam).toBe(true);
      expect(rule.formatTime?.(3600 + 600 + 30)).toBe('1h10m30s');
    });

    it('matches Douyin without time support', () => {
      const rule = findPlatformRule('https://www.douyin.com/video/123456');
      expect(rule.name).toBe('douyin');
      expect(rule.supportsTimeParam).toBe(false);
    });

    it('falls back to generic for unknown hosts', () => {
      const rule = findPlatformRule('https://example.com/video-page');
      expect(rule.name).toBe('generic');
      expect(rule.supportsTimeParam).toBe(false);
    });

    it('falls back to generic for invalid URLs', () => {
      const rule = findPlatformRule('not-a-url');
      expect(rule.name).toBe('generic');
    });
  });

  describe('cleanVideoTitle', () => {
    it('cleans YouTube suffix', () => {
      const rule = VIDEO_PLATFORM_RULES.find((r) => r.name === 'youtube')!;
      expect(cleanVideoTitle('Test Video - YouTube', rule)).toBe('Test Video');
    });

    it('cleans Bilibili suffixes', () => {
      const rule = VIDEO_PLATFORM_RULES.find((r) => r.name === 'bilibili')!;
      expect(cleanVideoTitle('测试视频_哔哩哔哩_bilibili', rule)).toBe('测试视频');
      expect(cleanVideoTitle('测试视频 - 哔哩哔哩', rule)).toBe('测试视频');
    });

    it('returns original title when no patterns match', () => {
      const rule = VIDEO_PLATFORM_RULES.find((r) => r.name === 'generic')!;
      expect(cleanVideoTitle('Plain Title', rule)).toBe('Plain Title');
    });

    it('falls back to current video label for empty result', () => {
      const rule = VIDEO_PLATFORM_RULES.find((r) => r.name === 'youtube')!;
      expect(cleanVideoTitle(' - YouTube', rule)).toBe('- YouTube');
    });
  });
});
