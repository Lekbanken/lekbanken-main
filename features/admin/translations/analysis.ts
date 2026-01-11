/**
 * Translation Analysis Utilities
 * 
 * Server-side utilities for analyzing translation files and generating coverage stats.
 */

import { locales, type Locale } from '@/lib/i18n/config';
import type { 
  TranslationCoverage, 
  NamespaceStats, 
  TranslationEntry,
  TranslationFilter,
} from './types';
import { calculateCompletion, getNamespaceFromKey } from './types';

// =============================================================================
// MESSAGE LOADING (Server-side only)
// =============================================================================

/**
 * Load all translation messages for a locale
 * This is a server-only function that reads from the messages directory
 */
export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  try {
    // Dynamic import of message files
    const messages = await import(`@/messages/${locale}.json`);
    return messages.default ?? messages;
  } catch (error) {
    console.error(`[translations] Failed to load messages for ${locale}:`, error);
    return {};
  }
}

/**
 * Load messages for all locales
 */
export async function loadAllMessages(): Promise<Record<Locale, Record<string, unknown>>> {
  const results: Record<Locale, Record<string, unknown>> = {} as Record<Locale, Record<string, unknown>>;
  
  for (const locale of locales) {
    results[locale] = await loadMessages(locale);
  }
  
  return results;
}

// =============================================================================
// KEY EXTRACTION
// =============================================================================

/**
 * Flatten a nested object into dot-notation keys
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    }
  }
  
  return result;
}

/**
 * Extract all unique keys from all locales
 */
export async function extractAllKeys(): Promise<Set<string>> {
  const allMessages = await loadAllMessages();
  const allKeys = new Set<string>();
  
  for (const locale of locales) {
    const flattened = flattenObject(allMessages[locale]);
    for (const key of Object.keys(flattened)) {
      allKeys.add(key);
    }
  }
  
  return allKeys;
}

// =============================================================================
// COVERAGE ANALYSIS
// =============================================================================

/**
 * Generate translation coverage statistics
 */
export async function getTranslationCoverage(): Promise<TranslationCoverage> {
  const allMessages = await loadAllMessages();
  const flattenedByLocale: Record<Locale, Record<string, string>> = {} as Record<Locale, Record<string, string>>;
  
  // Flatten all messages
  for (const locale of locales) {
    flattenedByLocale[locale] = flattenObject(allMessages[locale]);
  }
  
  // Collect all unique keys
  const allKeys = new Set<string>();
  for (const locale of locales) {
    for (const key of Object.keys(flattenedByLocale[locale])) {
      allKeys.add(key);
    }
  }
  
  // Group keys by namespace
  const keysByNamespace: Record<string, Set<string>> = {};
  for (const key of allKeys) {
    const namespace = getNamespaceFromKey(key);
    if (!keysByNamespace[namespace]) {
      keysByNamespace[namespace] = new Set();
    }
    keysByNamespace[namespace].add(key);
  }
  
  // Calculate namespace stats
  const namespaces: NamespaceStats[] = [];
  let totalMissing = 0;
  const missingPerLocale: Record<Locale, number> = {} as Record<Locale, number>;
  
  for (const locale of locales) {
    missingPerLocale[locale] = 0;
  }
  
  for (const [namespace, keys] of Object.entries(keysByNamespace)) {
    const totalKeys = keys.size;
    const translatedKeys: Record<Locale, number> = {} as Record<Locale, number>;
    const completionPercent: Record<Locale, number> = {} as Record<Locale, number>;
    let namespaceMissing = 0;
    
    for (const locale of locales) {
      let translated = 0;
      for (const key of keys) {
        if (flattenedByLocale[locale][key]) {
          translated++;
        } else {
          missingPerLocale[locale]++;
        }
      }
      translatedKeys[locale] = translated;
      completionPercent[locale] = calculateCompletion(translated, totalKeys);
    }
    
    // Count keys missing in any locale
    for (const key of keys) {
      const isMissing = locales.some(locale => !flattenedByLocale[locale][key]);
      if (isMissing) {
        namespaceMissing++;
        totalMissing++;
      }
    }
    
    namespaces.push({
      namespace,
      totalKeys,
      translatedKeys,
      completionPercent,
      missingCount: namespaceMissing,
    });
  }
  
  // Sort namespaces alphabetically
  namespaces.sort((a, b) => a.namespace.localeCompare(b.namespace));
  
  // Calculate overall percentages
  const totalKeys = allKeys.size;
  const overallPercent: Record<Locale, number> = {} as Record<Locale, number>;
  
  for (const locale of locales) {
    const translated = Object.keys(flattenedByLocale[locale]).length;
    overallPercent[locale] = calculateCompletion(translated, totalKeys);
  }
  
  return {
    totalKeys,
    namespaces,
    overallPercent,
    missingPerLocale,
    keysWithMissing: totalMissing,
    updatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// TRANSLATION ENTRIES
// =============================================================================

/**
 * Get translation entries with optional filtering
 */
export async function getTranslationEntries(
  filter?: TranslationFilter
): Promise<TranslationEntry[]> {
  const allMessages = await loadAllMessages();
  const flattenedByLocale: Record<Locale, Record<string, string>> = {} as Record<Locale, Record<string, string>>;
  
  // Flatten all messages
  for (const locale of locales) {
    flattenedByLocale[locale] = flattenObject(allMessages[locale]);
  }
  
  // Collect all unique keys
  const allKeys = new Set<string>();
  for (const locale of locales) {
    for (const key of Object.keys(flattenedByLocale[locale])) {
      allKeys.add(key);
    }
  }
  
  // Build entries
  const entries: TranslationEntry[] = [];
  
  for (const key of allKeys) {
    const namespace = getNamespaceFromKey(key);
    
    // Apply namespace filter
    if (filter?.namespace && namespace !== filter.namespace) {
      continue;
    }
    
    // Build values and check for missing
    const values: Record<Locale, string | null> = {} as Record<Locale, string | null>;
    const missingLocales: Locale[] = [];
    
    for (const locale of locales) {
      const value = flattenedByLocale[locale][key] ?? null;
      values[locale] = value;
      if (!value) {
        missingLocales.push(locale);
      }
    }
    
    const hasMissing = missingLocales.length > 0;
    
    // Apply missing filter
    if (filter?.missingOnly && !hasMissing) {
      continue;
    }
    
    // Apply locale-specific missing filter
    if (filter?.locale && !missingLocales.includes(filter.locale)) {
      continue;
    }
    
    // Apply search filter
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      const keyMatch = key.toLowerCase().includes(searchLower);
      const valueMatch = Object.values(values).some(
        v => v?.toLowerCase().includes(searchLower)
      );
      if (!keyMatch && !valueMatch) {
        continue;
      }
    }
    
    entries.push({
      key,
      namespace,
      values,
      hasMissing,
      missingLocales,
    });
  }
  
  // Sort by key
  entries.sort((a, b) => a.key.localeCompare(b.key));
  
  return entries;
}

/**
 * Get all unique namespaces
 */
export async function getNamespaces(): Promise<string[]> {
  const allKeys = await extractAllKeys();
  const namespaces = new Set<string>();
  
  for (const key of allKeys) {
    namespaces.add(getNamespaceFromKey(key));
  }
  
  return Array.from(namespaces).sort();
}
