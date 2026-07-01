import type { ExtensionSettings, Draft } from './types.js';
import { DEFAULT_SETTINGS, DEFAULT_DRAFT, STORAGE_KEYS } from './constants.js';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] ?? {}) };
}

export async function setSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function getDraft(): Promise<Draft> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.draft]);
  return { ...DEFAULT_DRAFT, ...(result[STORAGE_KEYS.draft] ?? {}) };
}

export async function setDraft(draft: Draft): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.draft]: draft });
}

export async function clearDraft(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.draft);
}
