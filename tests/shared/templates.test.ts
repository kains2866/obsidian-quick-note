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
import type { PageInfo, MediaInfo, Draft, ExtensionSettings } from '../../src/shared/types.js';

const fixedDate = new Date(2026, 6, 1, 15, 30, 44);

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
    expect(filename).toBe('example.com-path');
  });

  it('generates filename from content first line when title and url are off', () => {
    const filename = generateFilename('First line here\nsecond', { url: '', title: '', selectedText: '' }, false, false, fixedDate);
    expect(filename).toBe('First line here');
  });

  it('generates filename from timestamp when no title, url, or content', () => {
    const filename = generateFilename('', { url: '', title: '', selectedText: '' }, false, false, fixedDate);
    expect(filename).toBe('20260701-153044');
  });

  it('builds frontmatter', () => {
    const fm = buildFrontmatter('Note Title', page.url, DEFAULT_SETTINGS, fixedDate);
    expect(fm).toBe(
      '---\n' +
      'title: "Note Title"\n' +
      'date: "2026-07-01T07:30:44.000Z"\n' +
      'url: "https://example.com/path?x=1"\n' +
      'tags:\n' +
      '  - quick-note\n' +
      '---\n\n',
    );
  });

  it('builds frontmatter with all fields disabled', () => {
    const disabled: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterTitle: false,
      includeFrontmatterDate: false,
      includeFrontmatterUrl: false,
      includeFrontmatterTags: false,
    };
    const fm = buildFrontmatter('Note Title', page.url, disabled, fixedDate);
    expect(fm).toBe('');
  });

  it('builds note content with title and url as linked heading', () => {
    const content = buildNoteContent('my note', page, undefined, draft, DEFAULT_SETTINGS, fixedDate);
    expect(content).toBe(
      '---\n' +
      'title: "Example Page"\n' +
      'date: "2026-07-01T07:30:44.000Z"\n' +
      'url: "https://example.com/path?x=1"\n' +
      'tags:\n' +
      '  - quick-note\n' +
      '---\n\n' +
      '# [Example Page](https://example.com/path?x=1)\n' +
      'my note',
    );
  });

  it('builds note content with title only', () => {
    const titleOnlyDraft: Draft = { ...draft, includeUrl: false };
    const content = buildNoteContent('my note', page, undefined, titleOnlyDraft, DEFAULT_SETTINGS, fixedDate);
    expect(content).toContain('# Example Page');
    expect(content).not.toContain(`# [Example Page](${page.url})`);
  });

  it('builds note content with url only', () => {
    const urlOnlyDraft: Draft = { ...draft, includeTitle: false };
    const content = buildNoteContent('my note', page, undefined, urlOnlyDraft, DEFAULT_SETTINGS, fixedDate);
    expect(content).not.toContain('#');
    expect(content).toContain('https://example.com/path?x=1');
  });

  it('builds note content with all frontmatter disabled', () => {
    const disabled: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterTitle: false,
      includeFrontmatterDate: false,
      includeFrontmatterUrl: false,
      includeFrontmatterTags: false,
    };
    const content = buildNoteContent('my note', page, undefined, draft, disabled, fixedDate);
    expect(content).not.toContain('---');
    expect(content).toContain('# [Example Page](https://example.com/path?x=1)');
  });

  it('builds note content with media', () => {
    const content = buildNoteContent('my note', page, media, draft, DEFAULT_SETTINGS, fixedDate);
    expect(content).toContain('> [Cool Video](https://example.com/video) @ 03:24');
  });

  it('resolves note path', () => {
    const path = resolveNotePath('速记/2026/07', 'my-file');
    expect(path).toBe('速记/2026/07/my-file.md');
  });
});
