import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { getPendingLegalDocuments } from '@/lib/legal/acceptance'
import { MarkdownContent } from '@/components/legal/MarkdownContent'
import { acceptLegalDocuments } from '@/app/actions/legal'
import { Button } from '@/components/ui/button'

type AcceptPageProps = {
  searchParams: Promise<{
    redirect?: string
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.accept')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LegalAcceptPage({ searchParams }: AcceptPageProps) {
  const authContext = await getServerAuthContext('/legal/accept')
  if (!authContext.user) {
    const redirectTarget = encodeURIComponent('/legal/accept')
    redirect(`/auth/login?redirect=${redirectTarget}`)
  }

  const locale = await getLocale()
  const pendingDocs = await getPendingLegalDocuments(authContext.user.id, locale as 'sv' | 'no' | 'en')

  const resolvedParams = await searchParams
  const redirectParam = resolvedParams?.redirect ?? ''
  const redirectTo = redirectParam.startsWith('/') ? redirectParam : '/app'
  if (!pendingDocs.length) {
    redirect(redirectTo)
  }

  const t = await getTranslations('legal.accept')

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-muted-foreground mb-8">{t('intro')}</p>

      <form action={acceptLegalDocuments} className="space-y-10">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {pendingDocs.map((doc) => (
          <section key={doc.id} className="not-prose space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{doc.title}</h2>
              <p className="text-sm text-muted-foreground">
                {t('versionLabel', { version: doc.version_int })}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/60 p-6">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <MarkdownContent content={doc.content_markdown} />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                name={`accept_${doc.id}`}
                className="mt-1 h-4 w-4"
                required
              />
              <span>{t('acceptCheckbox', { title: doc.title })}</span>
            </label>

            <input type="hidden" name="documentId" value={doc.id} />
          </section>
        ))}

        <div className="not-prose flex justify-end">
          <Button type="submit">{t('acceptButton')}</Button>
        </div>
      </form>
    </div>
  )
}
