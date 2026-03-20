'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, useContext } from 'react';
import { locales, localeNames, LOCALE_COOKIE, getLocaleFromLanguageCode, type Locale } from '@/lib/i18n/config';
import { TenantContext } from '@/lib/context/TenantContext';
import { setLocalePreference } from '@/app/actions/locale';
import { getBrowserHostname, setBrowserCookie } from '@/lib/supabase/cookie-domain';

/**
 * Hook to switch the current locale
 * Sets the locale cookie, persists to database, and triggers a page refresh
 */
export function useLocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Get tenant context if available
  const tenantContext = useContext(TenantContext);
  const tenantId = tenantContext?.currentTenant?.id;

  const switchLocale = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Set cookie immediately for instant feedback
    setBrowserCookie(
      LOCALE_COOKIE,
      newLocale,
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      },
      getBrowserHostname()
    );

    // Persist to database via server action
    void setLocalePreference(newLocale, tenantId ?? undefined);

    // Refresh to apply new locale
    startTransition(() => {
      router.refresh();
    });
  };

  return {
    locale,
    locales,
    localeNames,
    switchLocale,
    isPending,
    /** Map legacy language code to locale */
    getLocaleFromLanguageCode,
  };
}
