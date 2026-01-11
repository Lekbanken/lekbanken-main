/**
 * i18n Configuration for Lekbanken
 * 
 * Supported locales and their configuration.
 * Uses next-intl for internationalization.
 */

export const locales = ['sv', 'en', 'no'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sv';

/**
 * Fallback chain for translations
 * If a translation is missing in the requested locale, fall back to these
 */
export const fallbackLocales: Record<Locale, Locale[]> = {
  sv: ['en'],
  no: ['sv', 'en'],
  en: ['sv'],
};

/**
 * Map from LanguageCode enum (NO/SE/EN) to locale code (no/sv/en)
 */
export const languageCodeToLocale: Record<string, Locale> = {
  NO: 'no',
  SE: 'sv',
  EN: 'en',
};

/**
 * Map from locale code to LanguageCode enum
 */
export const localeToLanguageCode: Record<Locale, string> = {
  no: 'NO',
  sv: 'SE',
  en: 'EN',
};

/**
 * Locale display names for UI
 */
export const localeNames: Record<Locale, string> = {
  sv: 'Svenska',
  no: 'Norsk',
  en: 'English',
};

/**
 * Cookie name for storing locale preference
 */
export const LOCALE_COOKIE = 'lb-locale';

/**
 * Validate if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from LanguageCode (NO/SE/EN)
 */
export function getLocaleFromLanguageCode(languageCode: string | null | undefined): Locale | null {
  if (!languageCode) return null;
  return languageCodeToLocale[languageCode.toUpperCase()] ?? null;
}

/**
 * Get LanguageCode from locale (no/sv/en)
 */
export function getLanguageCodeFromLocale(locale: Locale): string {
  return localeToLanguageCode[locale];
}
