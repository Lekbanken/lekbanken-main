import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { MarkdownContent } from '@/components/legal/MarkdownContent'
import { getActiveLegalDocument } from '@/lib/legal/legal-docs'

export default async function CookiePolicyPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const { doc } = await getActiveLegalDocument({ type: 'cookie_policy', locale })

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
    </div>
  )
}
