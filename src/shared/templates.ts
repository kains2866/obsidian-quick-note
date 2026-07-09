import type { ExtensionSettings, PageInfo, Draft, FrontmatterKey } from './types.js';
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
  date = new Date(),
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
    const pad = (n: number) => n.toString().padStart(2, '0');
    name = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  name = sanitizeFileName(name);
  if (name.length > MAX_FILENAME_LENGTH) {
    name = name.slice(0, MAX_FILENAME_LENGTH);
  }
  return name;
}

export function formatDateWithOffset(
  date: Date,
  timezoneOffsetMinutes = date.getTimezoneOffset(),
): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const offset = -timezoneOffsetMinutes;
  const sign = offset >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}${sign}${offsetHours}:${offsetMinutes}`;
}

function formatLocalDateTime(
  date: Date,
  timezoneOffsetMinutes = date.getTimezoneOffset(),
): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
}

function formatLocalDate(
  date: Date,
  timezoneOffsetMinutes = date.getTimezoneOffset(),
): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const shifted = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function formatFrontmatterDate(
  date: Date,
  format: ExtensionSettings['dateFormat'],
  timezoneOffsetMinutes = date.getTimezoneOffset(),
): { value: string; quoted: boolean } {
  switch (format) {
    case 'date':
      return { value: formatLocalDate(date, timezoneOffsetMinutes), quoted: false };
    case 'datetime':
      return { value: formatLocalDateTime(date, timezoneOffsetMinutes), quoted: true };
    case 'iso':
    default:
      return { value: formatDateWithOffset(date, timezoneOffsetMinutes), quoted: true };
  }
}

function escapeYamlValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function buildFrontmatter(
  page: PageInfo,
  settings: ExtensionSettings,
  date = new Date(),
  overrides?: Partial<Record<FrontmatterKey, boolean>>,
  draft?: Draft,
): string {
  const includeTitle = overrides?.title ?? settings.includeFrontmatterTitle;
  const includeDate = overrides?.date ?? settings.includeFrontmatterDate;
  const includeUrl = overrides?.url ?? settings.includeFrontmatterUrl;
  const includeAuthor = overrides?.author ?? settings.includeFrontmatterAuthor;
  const includeDescription = overrides?.description ?? settings.includeFrontmatterDescription;
  const includeSite = overrides?.site ?? settings.includeFrontmatterSite;
  const includeTags = overrides?.tags ?? settings.includeFrontmatterTags;
  const tags = draft?.selectedTags ?? settings.defaultTags;

  const fields: string[] = [];
  if (includeTitle && page.title) {
    fields.push(`title: "${escapeYamlValue(page.title)}"`);
  }
  if (includeDate) {
    const formatted = formatFrontmatterDate(date, settings.dateFormat);
    fields.push(formatted.quoted ? `date: "${formatted.value}"` : `date: ${formatted.value}`);
  }
  if (includeUrl && page.url) {
    fields.push(`url: "${escapeYamlValue(page.url)}"`);
  }
  if (includeAuthor && page.author) {
    fields.push(`author: "${escapeYamlValue(page.author)}"`);
  }
  if (includeDescription && page.description) {
    fields.push(`description: "${escapeYamlValue(page.description)}"`);
  }
  if (includeSite && page.site) {
    fields.push(`site: "${escapeYamlValue(page.site)}"`);
  }
  if (includeTags && tags.length > 0) {
    fields.push('tags:\n' + tags.map((t) => `  - ${t}`).join('\n'));
  }
  if (fields.length === 0) return '';
  return '---\n' + fields.join('\n') + '\n---\n\n';
}

export function buildNoteContent(
  userContent: string,
  page: PageInfo,
  draft: Draft,
  settings: ExtensionSettings,
  date = new Date(),
): string {
  const frontmatter = buildFrontmatter(page, settings, date, draft.frontmatterOverrides, draft);
  return frontmatter + userContent;
}

export function resolveNotePath(folder: string, filename: string): string {
  const normalizedFolder = folder.replace(/\/$/, '');
  return `${normalizedFolder}/${filename}.md`;
}
