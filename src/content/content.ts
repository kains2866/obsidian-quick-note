import type { PageInfo, MediaInfo } from '../shared/types.js';

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function getPageInfo(): PageInfo {
  const selection = window.getSelection()?.toString() ?? '';
  return {
    url: window.location.href,
    title: document.title,
    selectedText: selection,
  };
}

export function getMediaInfo(): MediaInfo | undefined {
  const video = document.querySelector('video');
  const audio = document.querySelector('audio');
  const media = video || audio;
  if (!media || media.paused || media.ended || media.currentTime === 0) {
    return undefined;
  }

  const session = (navigator as unknown as { mediaSession?: MediaSession }).mediaSession;
  const title = session?.metadata?.title || document.title;

  return {
    url: window.location.href,
    title,
    currentTime: formatDuration(media.currentTime),
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'GET_PAGE_INFO') {
    sendResponse(getPageInfo());
  } else if (request.type === 'GET_MEDIA_INFO') {
    sendResponse(getMediaInfo());
  }
  return true;
});
