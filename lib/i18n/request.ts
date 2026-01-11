import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isValidLocale, LOCALE_COOKIE, type Locale } from './config';

/**
 * Resolve the locale for a request.
 * Priority: Cookie → Accept-Language → Default
 * 
 * Note: Tenant-based resolution is handled via middleware/server context
 * and should override this when available.
 */
async function resolveLocale(): Promise<Locale> {
  // 1. Check cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "sv-SE,sv;q=0.9,en;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q = 'q=1'] = lang.trim().split(';');
        return {
          code: code.split('-')[0].toLowerCase(), // Extract primary language code
          quality: parseFloat(q.replace('q=', '')) || 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { code } of languages) {
      if (isValidLocale(code)) {
        return code;
      }
    }
  }

  // 3. Default fallback
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  // Load messages for the resolved locale
  // Using dynamic import for code splitting
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    // Time zone for date formatting
    timeZone: 'Europe/Stockholm',
    // Now for relative time calculations
    now: new Date(),
    // Format options
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
        medium: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
        full: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        },
        time: {
          hour: '2-digit',
          minute: '2-digit',
        },
        dateTime: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      },
      number: {
        currency: {
          style: 'currency',
          currency: 'SEK',
        },
        percent: {
          style: 'percent',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        },
      },
    },
  };
});
