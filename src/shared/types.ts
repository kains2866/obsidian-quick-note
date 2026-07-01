export type DateFormat = 'date' | 'datetime' | 'iso';

export interface ExtensionSettings {
  vaultName: string;
  baseFolder: string;
  dateSubfolderTemplate: string;
  dateFormat: DateFormat;
  includeSelectedText: boolean;
  includeFrontmatterTitle: boolean;
  includeFrontmatterDate: boolean;
  includeFrontmatterUrl: boolean;
  includeFrontmatterTags: boolean;
  includeFrontmatterAuthor: boolean;
  includeFrontmatterDescription: boolean;
  includeFrontmatterSite: boolean;
  defaultTags: string[];
}

export type FrontmatterKey = 'title' | 'date' | 'url' | 'author' | 'description' | 'site' | 'tags';

export interface Draft {
  content: string;
  includeUrl: boolean;
  includeTitle: boolean;
  targetFolder: string;
  targetFilename: string;
  frontmatterOverrides?: Partial<Record<FrontmatterKey, boolean>>;
}

export interface PageInfo {
  url: string;
  title: string;
  selectedText: string;
  author: string;
  description: string;
  site: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  path?: string;
}
