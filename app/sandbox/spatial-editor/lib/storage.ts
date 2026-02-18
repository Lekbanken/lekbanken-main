// =============================================================================
// Spatial Editor – localStorage persistence
// =============================================================================

import type { SpatialDocumentV1 } from './types';

const STORAGE_KEY = 'lekbanken:spatial-editor:v1';

export function saveDocument(doc: SpatialDocumentV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    console.warn('[spatial-editor] Failed to save document to localStorage');
  }
}

export function loadDocument(): SpatialDocumentV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpatialDocumentV1;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    console.warn('[spatial-editor] Failed to load document from localStorage');
    return null;
  }
}

export function clearDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function copyDocumentJson(doc: SpatialDocumentV1): void {
  const json = JSON.stringify(doc, null, 2);
  navigator.clipboard.writeText(json).catch(() => {
    // fallback: prompt
    window.prompt('Copy this JSON:', json);
  });
}
