import type { ExtensionSettings, SaveNoteRequest, SaveResult } from '../shared/types.js';

const FETCH_TIMEOUT_MS = 10000;
const MAX_CONFLICT_RETRIES = 10;

function buildApiUrl(path: string, settings: ExtensionSettings): string {
  const base = settings.apiUrl.replace(/\/$/, '');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/vault/${encodedPath}`;
}

function buildFetchInit(settings: ExtensionSettings): RequestInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${settings.apiKey}`,
    'Content-Type': 'text/markdown',
  };
  return {
    method: 'POST',
    headers,
    body: '',
  };
}

function withConflictSuffix(path: string, attempt: number): string {
  const lastSlash = path.lastIndexOf('/');
  const folder = path.slice(0, lastSlash + 1);
  const filename = path.slice(lastSlash + 1);
  const extIndex = filename.lastIndexOf('.');
  const stem = extIndex > 0 ? filename.slice(0, extIndex) : filename;
  const ext = extIndex > 0 ? filename.slice(extIndex) : '';
  return `${folder}${stem}-${attempt}${ext}`;
}

export async function saveNoteToObsidian(
  request: SaveNoteRequest,
  settings: ExtensionSettings,
): Promise<SaveResult> {
  let path = request.path;

  for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
    const url = buildApiUrl(path, settings);
    const init = buildFetchInit(settings);
    init.body = request.content;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    init.signal = controller.signal;

    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return { success: true, path };
      }

      if (response.status === 409 && attempt < MAX_CONFLICT_RETRIES) {
        path = withConflictSuffix(request.path, attempt + 1);
        continue;
      }

      const text = await response.text().catch(() => '');
      return { success: false, error: `Obsidian API error ${response.status}: ${text}` };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Network error: request timed out' };
      }
      return { success: false, error: `Network error: ${(err as Error).message}` };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { success: false, error: 'Obsidian API error 409: max retries exceeded' };
}

export async function testConnection(settings: ExtensionSettings): Promise<boolean> {
  try {
    const url = settings.apiUrl.replace(/\/$/, '');
    const response = await fetch(`${url}/`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${settings.apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: false,
    },
    () => {
      URL.revokeObjectURL(url);
    },
  );
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SAVE_NOTE') {
    saveNoteToObsidian(request.payload, request.settings).then((result) =>
      sendResponse(result),
    );
    return true;
  }
  if (request.type === 'TEST_CONNECTION') {
    testConnection(request.settings).then((ok) => sendResponse({ ok }));
    return true;
  }
  if (request.type === 'DOWNLOAD_NOTE') {
    downloadMarkdownFile(request.filename, request.content);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
