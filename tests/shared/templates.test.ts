import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  sanitizeFileName,
  generateFilename,
  buildFrontmatter,
  buildNoteContent,
  resolveNotePath,
} from '../../src/shared/templates.js';
import { DEFAULT_SETTINGS } from '../../src/shared/constants.js';
import type { PageInfo, MediaInfo, Draft } from '../../src/shared/types.js';

const page: PageInfo = {
  url: 'https://example.com/path?x=1',
  title: 'Example Page',
  selectedText: '',
};

const media: MediaInfo = {
  url: 'https://example.com/video',
  title: 'Cool Video',
  currentTime: '03:24',
};

const draft: Draft = {
  content: 'my note',
  includeUrl: true,
  includeTitle: true,
  includeMedia: true,
  targetFolder: '速记/2026/07',
  targetFilename: '',
};

describe('templates', () => {
  it('renders date template', () => {
    const result = renderTemplate('{{YYYY}}/{{MM}}', new Date('2026-07-01T15:53:52'));
    expect(result).toBe('2026/07');
  });

  it('sanitizes filename', () => {
    expect(sanitizeFileName('a/b:c?d')).toBe('a-b-c-d');
  });

  it('truncates long filename', () => {
    const long = 'a'.repeat(100);
    expect(generateFilename(long).length).toBeLessThanOrEqual(80);
  });

  it('generates filename from title when title toggle on', () => {
    const filename = generateFilename('', page, true, false);
    expect(filename).toBe('Example Page');
  });

  it('generates filename from url when url toggle on', () => {
    const filename = generateFilename('', page, false, true);
    expect(filename).toContain('example.com');
  });

  it('generates filename from content first line fallback', () => {
    const filename = generateFilename('First line here\nsecond', { url: '', title: '', selectedText: '' }, false, false);
    expect(filename).toBe('First line here');
  });

  it('builds frontmatter', () => {
    const fm = buildFrontmatter('Note Title', page.url, DEFAULT_SETTINGS);
    expect(fm).toContain('title: "Note Title"');
    expect(fm).toContain('url: "https://example.com/path?x=1"');
    expect(fm).toContain('- quick-note');
  });

  it('builds note content with title and url', () => {
    const content = buildNoteContent('my note', page, undefined, draft, DEFAULT_SETTINGS);
    expect(content).toContain('# Example Page');
    expect(content).toContain('https://example.com/path?x=1');
    expect(content).toContain('my note');
  });

  it('builds note content with media', () => {
    const content = buildNoteContent('my note', page, media, draft, DEFAULT_SETTINGS);
    expect(content).toContain('> [Cool Video](https://example.com/video) @ 03:24');
  });

  it('resolves note path', () => {
    const path = resolveNotePath('速记', '2026/07', 'my-file');
    expect(path).toBe('速记/2026/07/my-file.md');
  });
});
