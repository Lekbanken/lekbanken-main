/**
 * Translation Management Types
 * 
 * Types and utilities for the admin translation hub.
 */

import type { Locale } from '@/lib/i18n/config';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * A single translation key with its values across all locales
 */
export type TranslationEntry = {
  /** Dot-notation key path, e.g. "admin.nav.dashboard" */
  key: string;
  /** Namespace (first segment), e.g. "admin" */
  namespace: string;
  /** Values for each locale */
  values: Record<Locale, string | null>;
  /** Whether the key has any missing translations */
  hasMissing: boolean;
  /** Locales that are missing this translation */
  missingLocales: Locale[];
};

/**
 * Statistics for a single namespace
 */
export type NamespaceStats = {
  /** Namespace name, e.g. "admin", "common", "app" */
  namespace: string;
  /** Total number of unique keys */
  totalKeys: number;
  /** Keys translated per locale */
  translatedKeys: Record<Locale, number>;
  /** Percentage complete per locale (0-100) */
  completionPercent: Record<Locale, number>;
  /** Keys missing translations in at least one locale */
  missingCount: number;
};

/**
 * Overall translation coverage statistics
 */
export type TranslationCoverage = {
  /** Total unique keys across all namespaces */
  totalKeys: number;
  /** Stats per namespace */
  namespaces: NamespaceStats[];
  /** Overall completion percentage per locale */
  overallPercent: Record<Locale, number>;
  /** Total missing translations per locale */
  missingPerLocale: Record<Locale, number>;
  /** Total keys with any missing translation */
  keysWithMissing: number;
  /** Last updated timestamp */
  updatedAt: string;
};

/**
 * Filter options for translation listing
 */
export type TranslationFilter = {
  /** Filter by namespace */
  namespace?: string;
  /** Filter to show only missing translations */
  missingOnly?: boolean;
  /** Search query for key or value */
  search?: string;
  /** Specific locale to check for missing */
  locale?: Locale;
};

// =============================================================================
// NAMESPACE DEFINITIONS
// =============================================================================

/**
 * Known translation namespaces with metadata
 */
export const TRANSLATION_NAMESPACES = [
  { 
    id: 'common', 
    label: 'Common', 
    description: 'Shared UI elements, actions, labels',
    icon: 'squares',
  },
  { 
    id: 'admin', 
    label: 'Admin', 
    description: 'Admin panel UI strings',
    icon: 'cog',
  },
  { 
    id: 'app', 
    label: 'App', 
    description: 'Main application strings',
    icon: 'device',
  },
  { 
    id: 'auth', 
    label: 'Auth', 
    description: 'Authentication and authorization',
    icon: 'key',
  },
  { 
    id: 'errors', 
    label: 'Errors', 
    description: 'Error messages and validation',
    icon: 'exclamation',
  },
  { 
    id: 'marketing', 
    label: 'Marketing', 
    description: 'Landing pages and marketing content',
    icon: 'megaphone',
  },
] as const;

export type NamespaceId = (typeof TRANSLATION_NAMESPACES)[number]['id'];

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse a dot-notation key to extract namespace
 */
export function getNamespaceFromKey(key: string): string {
  return key.split('.')[0] ?? 'unknown';
}

/**
 * Get the relative key (without namespace prefix)
 */
export function getRelativeKey(key: string): string {
  const parts = key.split('.');
  return parts.slice(1).join('.');
}

/**
 * Calculate completion percentage
 */
export function calculateCompletion(translated: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((translated / total) * 100);
}

/**
 * Get color class for completion percentage
 */
export function getCompletionColor(percent: number): string {
  if (percent >= 95) return 'text-emerald-600 bg-emerald-100';
  if (percent >= 75) return 'text-amber-600 bg-amber-100';
  if (percent >= 50) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Get status badge variant for completion
 */
export function getCompletionBadgeVariant(percent: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (percent >= 95) return 'default';
  if (percent >= 75) return 'secondary';
  if (percent >= 50) return 'outline';
  return 'destructive';
}
