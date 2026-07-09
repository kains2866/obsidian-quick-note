export type DateFormat = 'date' | 'datetime' | 'iso';

export interface ExtensionSettings {
  vaultName: string;
  baseFolder: string;
  dateSubfolderTemplate: string;
  dateFormat: DateFormat;
  includeSelectedText: boolean;
  preserveImagesInSelection: boolean;
  includeFrontmatterTitle: boolean;
  includeFrontmatterDate: boolean;
  includeFrontmatterUrl: boolean;
  includeFrontmatterTags: boolean;
  includeFrontmatterAuthor: boolean;
  includeFrontmatterDescription: boolean;
  includeFrontmatterSite: boolean;
  defaultTags: string[];
  autoSelectFirstTag: boolean;
  domainTagRules: Array<{ domain: string; tags: string[] }>;
  captureVideoProgress: boolean;
}

export type FrontmatterKey = 'title' | 'date' | 'url' | 'author' | 'description' | 'site' | 'tags';

export interface Draft {
  content: string;
  includeUrl: boolean;
  includeTitle: boolean;
  targetFolder: string;
  targetFilename: string;
  frontmatterOverrides?: Partial<Record<FrontmatterKey, boolean>>;
  selectedTags?: string[];
  tempTags?: string[];
  lastVideoProgress?: {
    currentTime: number;
    url: string;
  };
}

export interface PageInfo {
  url: string;
  title: string;
  selectedText: string;
  selectedContent?: string;
  author: string;
  description: string;
  site: string;
  videoProgress?: VideoProgress | null;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  path?: string;
}

export interface VideoProgress {
  currentTime: string;
  duration: string;
  title: string;
  link: string;
  platform: string;
}
