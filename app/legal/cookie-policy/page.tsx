import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { MarkdownContent } from '@/components/legal/MarkdownContent'
import { getActiveLegalDocument } from '@/lib/legal/legal-docs'
import { createServerRlsClient } from '@/lib/supabase/server'
import { CookieDeclarationTable } from '@/components/cookie/CookieDeclarationTable'
import { CookieSettingsButton } from '@/components/cookie/CookieConsentBanner'
import type { CookieCatalogEntry } from '@/lib/consent/types'

async function getCookieCatalog(): Promise<CookieCatalogEntry[]> {
  const supabase = await createServerRlsClient()
  
  const { data, error } = await supabase
    .from('cookie_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[cookie-policy] Failed to load cookie catalog:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    key: row.key,
    category: row.category as CookieCatalogEntry['category'],
    purpose: row.purpose,
    purposeTranslations: (row.purpose_translations ?? {}) as Record<string, string>,
    provider: row.provider,
    ttlDays: row.ttl_days,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
  }))
}

export default async function CookiePolicyPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const tConsent = await getTranslations('cookie_consent')
  const { doc } = await getActiveLegalDocument({ type: 'cookie_policy', locale: locale as 'sv' | 'no' | 'en' })
  const cookies = await getCookieCatalog()

  const lastUpdated = doc?.published_at
    ? new Date(doc.published_at).toLocaleDateString(locale)
    : new Date().toLocaleDateString(locale)

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <div className="not-prose mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('common.backToHome')}
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-4">{doc?.title ?? 'Cookie Policy'}</h1>
      <p className="text-muted-foreground mb-8">
        {t('common.lastUpdated', { date: lastUpdated })}
      </p>

      {doc ? (
        <MarkdownContent content={doc.content_markdown} />
      ) : (
        <p>Cookie policy content will be published soon.</p>
      )}

      {/* Cookie Declaration Table */}
      <div className="not-prose mt-12">
        <h2 className="text-2xl font-bold text-zinc-950 dark:text-white mb-4">
          {tConsent('declaration.title')}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {tConsent('declaration.description')}
        </p>

        {cookies.length > 0 ? (
          <CookieDeclarationTable cookies={cookies} />
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            No cookies registered yet.
          </p>
        )}

        {/* Manage Preferences Button */}
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
            {tConsent('change_preferences')}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            You can change your cookie preferences at any time by clicking the button below.
          </p>
          <CookieSettingsButton className="inline-flex items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
