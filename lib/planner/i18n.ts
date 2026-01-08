/**
 * Planner i18n utilities
 * Provides type-safe translations for the planner domain
 */

import locales from './locales.json'

export type PlannerLocale = 'sv' | 'en'

type PlannerTranslations = (typeof locales)['sv']['planner']
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type PlannerTranslationKey = NestedKeyOf<PlannerTranslations>

const DEFAULT_LOCALE: PlannerLocale = 'sv'

/**
 * Get a nested value from an object using a dot-separated path
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Get a translated string for the planner domain
 * 
 * @param key - Dot-separated key path (e.g., 'status.draft', 'actions.publish')
 * @param locale - Target locale (defaults to Swedish)
 * @returns Translated string or the key if not found
 * 
 * @example
 * t('status.draft') // 'Utkast'
 * t('actions.publish', 'en') // 'Publish'
 */
export function t(key: PlannerTranslationKey, locale: PlannerLocale = DEFAULT_LOCALE): string {
  const translations = locales[locale]?.planner ?? locales[DEFAULT_LOCALE].planner
  const value = getNestedValue(translations, key)
  
  if (value === undefined) {
    // Fallback to default locale
    const fallbackValue = getNestedValue(locales[DEFAULT_LOCALE].planner, key)
    if (fallbackValue === undefined) {
      console.warn(`[planner/i18n] Missing translation for key: ${key}`)
      return key
    }
    return fallbackValue
  }
  
  return value
}

/**
 * Get all translations for a specific section
 * 
 * @param section - Section key (e.g., 'status', 'actions')
 * @param locale - Target locale
 * @returns Object with all translations in that section
 */
export function getSection<K extends keyof PlannerTranslations>(
  section: K,
  locale: PlannerLocale = DEFAULT_LOCALE
): PlannerTranslations[K] {
  const translations = locales[locale]?.planner ?? locales[DEFAULT_LOCALE].planner
  return translations[section]
}

/**
 * Create a scoped translation function for a specific section
 * 
 * @param section - Section to scope to
 * @param locale - Target locale
 * @returns Scoped translation function
 * 
 * @example
 * const tStatus = scopedT('status')
 * tStatus('draft') // 'Utkast'
 */
export function scopedT<K extends keyof PlannerTranslations>(
  section: K,
  locale: PlannerLocale = DEFAULT_LOCALE
): (key: keyof PlannerTranslations[K]) => string {
  return (key) => {
    const fullKey = `${section}.${String(key)}` as PlannerTranslationKey
    return t(fullKey, locale)
  }
}

/**
 * Hook-friendly translation getter (for use in React components)
 * Returns an object with common translation utilities
 */
export function usePlannerTranslations(locale: PlannerLocale = DEFAULT_LOCALE) {
  return {
    t: (key: PlannerTranslationKey) => t(key, locale),
    tStatus: scopedT('status', locale),
    tVisibility: scopedT('visibility', locale),
    tActions: scopedT('actions', locale),
    tBlocks: scopedT('blocks', locale),
    tErrors: scopedT('errors', locale),
    tSuccess: scopedT('success', locale),
    locale,
  }
}

// Re-export locale data for direct access if needed
export { locales as plannerLocales }
