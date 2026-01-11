import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

/**
 * next-intl navigation utilities
 * 
 * We use 'never' for localePrefix since we don't want /sv, /en, /no in URLs.
 * Locale is stored in cookie instead.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'never',
});
