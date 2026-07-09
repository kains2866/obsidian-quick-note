import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderTemplate,
  sanitizeFileName,
  generateFilename,
  formatFrontmatterDate,
  buildFrontmatter,
  buildNoteContent,
  resolveNotePath,
} from '../../src/shared/templates.js';
import { DEFAULT_SETTINGS, DEFAULT_DRAFT } from '../../src/shared/constants.js';
import type { PageInfo, Draft, ExtensionSettings } from '../../src/shared/types.js';

const fixedDate = new Date(2026, 6, 1, 15, 30, 44);

const page: PageInfo = {
  url: 'https://example.com/path?x=1',
  title: 'Example Page',
  selectedText: '',
  author: 'John Doe',
  description: 'An example page',
  site: 'example.com',
};

const emptyPage: PageInfo = {
  url: '',
  title: '',
  selectedText: '',
  author: '',
  description: '',
  site: '',
};

const draft: Draft = {
  content: 'my note',
  includeUrl: true,
  includeTitle: true,
  targetFolder: '速记/2026/07',
  targetFilename: '',
};

describe('templates', () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-480);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders date template', () => {
    const result = renderTemplate('{{YYYY}}/{{MM}}', new Date('2026-07-01T15:53:52'));
    expect(result).toBe('2026/07');
  });

  it('preserves fixed text in date template', () => {
    const result = renderTemplate('{{YYYY}}/doc', new Date('2026-07-01T15:53:52'));
    expect(result).toBe('2026/doc');
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

  it('generates filename from url when url toggle on and title toggle off', () => {
    const filename = generateFilename('', page, false, true);
    expect(filename).toBe('example.com-path');
  });

  it('generates filename from content first line when title and url toggles are off', () => {
    const filename = generateFilename('First line here\nsecond', emptyPage, false, false, fixedDate);
    expect(filename).toBe('First line here');
  });

  it('generates filename from timestamp when no title, url, or content', () => {
    const filename = generateFilename('', emptyPage, false, false, fixedDate);
    expect(filename).toBe('20260701-153044');
  });

  it('builds frontmatter with default date-only format', () => {
    const fm = buildFrontmatter(page, DEFAULT_SETTINGS, fixedDate);
    expect(fm).toBe(
      '---\n' +
      'title: "Example Page"\n' +
      'date: 2026-07-01\n' +
      'url: "https://example.com/path?x=1"\n' +
      'tags:\n' +
      '  - quick-note\n' +
      '---\n\n',
    );
  });

  it('builds frontmatter with datetime date format', () => {
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, dateFormat: 'datetime' };
    const fm = buildFrontmatter(page, settings, fixedDate);
    expect(fm).toContain('date: "2026-07-01 15:30:44"');
  });

  it('builds frontmatter with iso date format', () => {
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, dateFormat: 'iso' };
    const fm = buildFrontmatter(page, settings, fixedDate);
    expect(fm).toContain('date: "2026-07-01T15:30:44+08:00"');
  });

  it('builds frontmatter with author, description, and site', () => {
    const settings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterAuthor: true,
      includeFrontmatterDescription: true,
      includeFrontmatterSite: true,
    };
    const fm = buildFrontmatter(page, settings, fixedDate);
    expect(fm).toContain('author: "John Doe"');
    expect(fm).toContain('description: "An example page"');
    expect(fm).toContain('site: "example.com"');
  });

  it('skips empty optional frontmatter fields', () => {
    const settings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterAuthor: true,
      includeFrontmatterDescription: true,
      includeFrontmatterSite: true,
    };
    const fm = buildFrontmatter(emptyPage, settings, fixedDate);
    expect(fm).not.toContain('author:');
    expect(fm).not.toContain('description:');
    expect(fm).not.toContain('site:');
  });

  it('builds frontmatter with all fields disabled', () => {
    const disabled: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterTitle: false,
      includeFrontmatterDate: false,
      includeFrontmatterUrl: false,
      includeFrontmatterTags: false,
    };
    const fm = buildFrontmatter(page, disabled, fixedDate);
    expect(fm).toBe('');
  });

  it('builds note content with only user content and frontmatter', () => {
    const content = buildNoteContent('my note', page, draft, DEFAULT_SETTINGS, fixedDate);
    expect(content).toBe(
      '---\n' +
      'title: "Example Page"\n' +
      'date: 2026-07-01\n' +
      'url: "https://example.com/path?x=1"\n' +
      'tags:\n' +
      '  - quick-note\n' +
      '---\n\n' +
      'my note',
    );
  });

  it('does not insert title or url into body regardless of toggles', () => {
    const content = buildNoteContent('my note', page, draft, DEFAULT_SETTINGS, fixedDate);
    expect(content).not.toContain('# Example Page');
    expect(content).toMatch(/---[\s\S]*---\n\nmy note$/);
  });

  it('builds note content with all frontmatter disabled', () => {
    const disabled: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      includeFrontmatterTitle: false,
      includeFrontmatterDate: false,
      includeFrontmatterUrl: false,
      includeFrontmatterTags: false,
    };
    const content = buildNoteContent('my note', page, draft, disabled, fixedDate);
    expect(content).not.toContain('---');
    expect(content).toBe('my note');
  });

  it('builds note content using draft.selectedTags', () => {
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, defaultTags: ['quick-note', 'idea'] };
    const draftWithTags: Draft = { ...draft, selectedTags: ['idea'] };
    const content = buildNoteContent('my note', page, draftWithTags, settings, fixedDate);
    expect(content).toContain('tags:\n  - idea');
    expect(content).not.toContain('quick-note');
  });

  it('falls back to defaultTags when draft.selectedTags is undefined', () => {
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, defaultTags: ['quick-note', 'idea'] };
    const draftWithoutTags: Draft = { ...draft, selectedTags: undefined };
    const content = buildNoteContent('my note', page, draftWithoutTags, settings, fixedDate);
    expect(content).toContain('tags:\n  - quick-note\n  - idea');
  });

  it('renders empty tags when draft.selectedTags is an empty array', () => {
    const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, defaultTags: ['quick-note'] };
    const draftWithEmptyTags: Draft = { ...draft, selectedTags: [] };
    const content = buildNoteContent('my note', page, draftWithEmptyTags, settings, fixedDate);
    expect(content).not.toContain('tags:');
    expect(content).not.toContain('quick-note');
  });

  it('formats frontmatter date as unquoted date-only by default', () => {
    const result = formatFrontmatterDate(fixedDate, 'date');
    expect(result).toEqual({ value: '2026-07-01', quoted: false });
  });

  it('formats frontmatter datetime as quoted string', () => {
    const result = formatFrontmatterDate(fixedDate, 'datetime');
    expect(result).toEqual({ value: '2026-07-01 15:30:44', quoted: true });
  });

  it('formats frontmatter iso as quoted string', () => {
    const result = formatFrontmatterDate(fixedDate, 'iso');
    expect(result).toEqual({ value: '2026-07-01T15:30:44+08:00', quoted: true });
  });

  it('resolves note path', () => {
    const path = resolveNotePath('速记/2026/07', 'my-file');
    expect(path).toBe('速记/2026/07/my-file.md');
  });
});

describe('frontmatter overrides', () => {
  it('can disable title via override', () => {
    const settings = { ...DEFAULT_SETTINGS, includeFrontmatterTitle: true };
    const result = buildFrontmatter(page, settings, new Date(), { title: false });
    expect(result).not.toContain('title:');
  });

  it('can enable author via override', () => {
    const settings = { ...DEFAULT_SETTINGS, includeFrontmatterAuthor: false };
    const pageWithAuthor: PageInfo = { ...page, author: 'John' };
    const result = buildFrontmatter(pageWithAuthor, settings, new Date(), { author: true });
    expect(result).toContain('author: "John"');
  });

  it('buildNoteContent uses draft overrides', () => {
    const settings = { ...DEFAULT_SETTINGS, includeFrontmatterTitle: true };
    const draft: Draft = { ...DEFAULT_DRAFT, frontmatterOverrides: { title: false } };
    const content = buildNoteContent('body', page, draft, settings);
    expect(content).toContain('body');
    expect(content).not.toContain('title:');
  });
});
