/**
 * Server action to set the user's locale preference
 * 
 * This action:
 * 1. Sets the locale cookie for next-intl
 * 2. Optionally persists to user_preferences table (if authenticated)
 */
'use server'

import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { 
  LOCALE_COOKIE, 
  isValidLocale, 
  getLanguageCodeFromLocale,
  type Locale 
} from '@/lib/i18n/config'

type SetLocaleResult = 
  | { success: true; locale: Locale }
  | { success: false; error: string }

/**
 * Sets the user's locale preference
 * @param locale - The locale to set (sv, en, no)
 * @param tenantId - Optional tenant ID for scoped preferences
 */
export async function setLocalePreference(
  locale: string,
  tenantId?: string
): Promise<SetLocaleResult> {
  // Validate locale
  if (!isValidLocale(locale)) {
    return { success: false, error: `Invalid locale: ${locale}` }
  }

  const validLocale = locale as Locale

  try {
    // 1. Set cookie for next-intl (expires in 1 year)
    const cookieStore = await cookies()
    cookieStore.set(LOCALE_COOKIE, validLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    // 2. If authenticated, persist to database
    const supabase = await createServerRlsClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Map next-intl locale to legacy LanguageCode format for compatibility
      const languageCode = getLanguageCodeFromLocale(validLocale) as 'NO' | 'SE' | 'EN'

      // Update users table
      await supabase
        .from('users')
        .update({ language: languageCode })
        .eq('id', user.id)

      // Update user_preferences if tenant is provided
      if (tenantId) {
        await supabase
          .from('user_preferences')
          .upsert(
            {
              tenant_id: tenantId,
              user_id: user.id,
              language: languageCode,
            },
            { onConflict: 'tenant_id, user_id' }
          )
      }
    }

    return { success: true, locale: validLocale }
  } catch (error) {
    console.error('[setLocalePreference] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
