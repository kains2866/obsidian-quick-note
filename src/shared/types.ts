export interface ExtensionSettings {
  apiUrl: string;
  apiKey: string;
  baseFolder: string;
  dateSubfolderTemplate: string;
  includeFrontmatterTitle: boolean;
  includeFrontmatterDate: boolean;
  includeFrontmatterUrl: boolean;
  includeFrontmatterTags: boolean;
  defaultTags: string[];
  ignoreCertErrors: boolean;
}

export interface Draft {
  content: string;
  includeUrl: boolean;
  includeTitle: boolean;
  includeMedia: boolean;
  targetFolder: string;
  targetFilename: string;
}

export interface PageInfo {
  url: string;
  title: string;
  selectedText: string;
}

export interface MediaInfo {
  url: string;
  title: string;
  currentTime: string;
}

export interface SaveNoteRequest {
  path: string;
  content: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  path?: string;
}
