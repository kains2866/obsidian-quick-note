import type { ExtensionSettings, PageInfo, MediaInfo, Draft } from './types.js';
import { MAX_FILENAME_LENGTH } from './constants.js';

export function renderTemplate(template: string, date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return template
    .replace(/\{\{YYYY\}\}/g, date.getFullYear().toString())
    .replace(/\{\{MM\}\}/g, pad(date.getMonth() + 1))
    .replace(/\{\{DD\}\}/g, pad(date.getDate()))
    .replace(/\{\{HH\}\}/g, pad(date.getHours()))
    .replace(/\{\{mm\}\}/g, pad(date.getMinutes()))
    .replace(/\{\{ss\}\}/g, pad(date.getSeconds()));
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateFilename(
  content: string,
  page?: PageInfo,
  includeTitle = false,
  includeUrl = false,
): string {
  let name = '';
  if (includeTitle && page?.title) {
    name = page.title;
  } else if (includeUrl && page?.url) {
    try {
      const url = new URL(page.url);
      name = url.hostname + url.pathname;
    } catch {
      name = page.url;
    }
  }

  if (!name && content) {
    name = content.split('\n')[0].trim();
  }

  if (!name) {
    const timestamp = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    name = `${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}-${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}`;
  }

  name = sanitizeFileName(name);
  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH);
  }
  return name;
}

export function buildFrontmatter(
  title: string,
  url: string,
  settings: ExtensionSettings,
): string {
  const fields: string[] = [];
  if (settings.includeFrontmatterTitle) {
    fields.push(`title: "${title.replace(/"/g, '\\"')}"`);
  }
  if (settings.includeFrontmatterDate) {
    fields.push(`date: "${new Date().toISOString()}"`);
  }
  if (settings.includeFrontmatterUrl && url) {
    fields.push(`url: "${url.replace(/"/g, '\\"')}"`);
  }
  if (settings.includeFrontmatterTags && settings.defaultTags.length > 0) {
    fields.push('tags:\n' + settings.defaultTags.map((t) => `  - ${t}`).join('\n'));
  }
  if (fields.length === 0) return '';
  return '---\n' + fields.join('\n') + '\n---\n\n';
}

export function buildNoteContent(
  userContent: string,
  page: PageInfo,
  media: MediaInfo | undefined,
  draft: Draft,
  settings: ExtensionSettings,
): string {
  const parts: string[] = [];

  if (draft.includeTitle && page.title) {
    parts.push(`# ${page.title}`);
  }
  if (draft.includeUrl && page.url) {
    parts.push(page.url);
  }

  if (draft.includeMedia && media) {
    parts.push(`> [${media.title}](${media.url}) @ ${media.currentTime}`);
  }

  if (parts.length > 0) {
    parts.push('');
  }

  const fullContent = parts.join('\n') + userContent;
  const frontmatter = buildFrontmatter(
    draft.targetFilename || page.title || 'Quick Note',
    page.url,
    settings,
  );
  return frontmatter + fullContent;
}

export function resolveNotePath(
  baseFolder: string,
  dateSubfolder: string,
  filename: string,
): string {
  const folder = [baseFolder, dateSubfolder].filter(Boolean).join('/');
  return `${folder}/${filename}.md`;
}
