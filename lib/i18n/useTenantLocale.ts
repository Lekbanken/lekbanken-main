'use client';

import { useLocale } from 'next-intl';
import { useContext, useMemo } from 'react';
import { TenantContext } from '@/lib/context/TenantContext';
import { 
  isValidLocale, 
  getLocaleFromLanguageCode, 
  defaultLocale, 
  type Locale 
} from '@/lib/i18n/config';

/**
 * Hook that resolves the effective locale considering:
 * 1. User's explicit preference (from next-intl / cookie)
 * 2. Tenant's main_language as fallback for new users
 * 
 * Priority:
 * - If user has set a preference → use user preference
 * - If no user preference and tenant has main_language → use tenant language
 * - Otherwise → use default locale
 */
export function useTenantLocale() {
  // User's current locale from next-intl (resolved from cookie/browser)
  const userLocale = useLocale() as Locale;
  
  // Get tenant context (may be undefined outside TenantProvider)
  const tenantContext = useContext(TenantContext);
  const currentTenant = tenantContext?.currentTenant;

  // Get tenant's main_language and convert to locale
  const tenantLocale = useMemo(() => {
    if (!currentTenant) return null;
    // Access main_language from tenant object
    const tenantLang = (currentTenant as unknown as { main_language?: string }).main_language;
    if (!tenantLang) return null;
    return getLocaleFromLanguageCode(tenantLang);
  }, [currentTenant]);

  // Effective locale (user preference takes priority)
  const effectiveLocale = useMemo(() => {
    // User's cookie preference is always primary
    if (userLocale && isValidLocale(userLocale)) {
      return userLocale;
    }
    // Fall back to tenant language if available
    if (tenantLocale) {
      return tenantLocale;
    }
    // Ultimate fallback
    return defaultLocale;
  }, [userLocale, tenantLocale]);

  return {
    /** The user's explicitly set locale (from cookie/browser) */
    userLocale,
    /** The tenant's configured main_language as a locale */
    tenantLocale,
    /** The effective locale to use (user > tenant > default) */
    locale: effectiveLocale,
    /** Whether user has a tenant context */
    hasTenant: !!currentTenant,
    /** The current tenant */
    tenant: currentTenant,
  };
}
