import type { ExtensionSettings, SaveNoteRequest, SaveResult } from '../shared/types.js';

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

export async function saveNoteToObsidian(
  request: SaveNoteRequest,
  settings: ExtensionSettings,
): Promise<SaveResult> {
  try {
    const url = buildApiUrl(request.path, settings);
    const init = buildFetchInit(settings);
    init.body = request.content;

    const response = await fetch(url, init);
    if (response.ok) {
      return { success: true, path: request.path };
    }
    const text = await response.text().catch(() => '');
    return { success: false, error: `Obsidian API error ${response.status}: ${text}` };
  } catch (err) {
    return { success: false, error: `Network error: ${(err as Error).message}` };
  }
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
