import type { ExtensionSettings, Draft } from './types.js';
import { DEFAULT_SETTINGS, DEFAULT_DRAFT, STORAGE_KEYS } from './constants.js';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] ?? {}) };
}

export async function setSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export async function getDraft(tabId: number): Promise<Draft> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.drafts]);
  const drafts = (result[STORAGE_KEYS.drafts] ?? {}) as Record<number, Draft>;
  return { ...DEFAULT_DRAFT, ...(drafts[tabId] ?? {}) };
}

export async function setDraft(tabId: number, draft: Draft): Promise<void> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.drafts]);
  const drafts = { ...((result[STORAGE_KEYS.drafts] ?? {}) as Record<number, Draft>) };
  drafts[tabId] = draft;
  await chrome.storage.local.set({ [STORAGE_KEYS.drafts]: drafts });
}

export async function clearDraft(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.drafts]);
  const drafts = { ...((result[STORAGE_KEYS.drafts] ?? {}) as Record<number, Draft>) };
  delete drafts[tabId];
  await chrome.storage.local.set({ [STORAGE_KEYS.drafts]: drafts });
}

export async function removeDraft(tabId: number): Promise<void> {
  await clearDraft(tabId);
}

export async function getAllDrafts(): Promise<Record<number, Draft>> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.drafts]);
  return { ...((result[STORAGE_KEYS.drafts] ?? {}) as Record<number, Draft>) };
}
