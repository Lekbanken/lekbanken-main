import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { MarkdownContent } from '@/components/legal/MarkdownContent'
import { getActiveLegalDocument } from '@/lib/legal/legal-docs'

export async function generateMetadata() {
  const t = await getTranslations('legal.privacy.metadata')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const p = await getTranslations('legal.privacy')
  const s = await getTranslations('legal.privacy.sections')
  const { doc } = await getActiveLegalDocument({ type: 'privacy', locale: locale as 'sv' | 'no' | 'en' })

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

      <h1 className="text-4xl font-bold mb-4">{doc?.title ?? p('title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('common.lastUpdated', { date: lastUpdated })}
      </p>

      {doc ? (
        <MarkdownContent content={doc.content_markdown} />
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('introduction.title')}</h2>
            <p>{s('introduction.content')}</p>
            <p>{s('introduction.gdpr')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('dataCollection.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">{s('dataCollection.provided.title')}</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('dataCollection.provided.account')}</strong></li>
              <li><strong>{s('dataCollection.provided.profile')}</strong></li>
              <li><strong>{s('dataCollection.provided.organization')}</strong></li>
              <li><strong>{s('dataCollection.provided.payment')}</strong></li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('dataCollection.automatic.title')}</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('dataCollection.automatic.usage')}</strong></li>
              <li><strong>{s('dataCollection.automatic.device')}</strong></li>
              <li><strong>{s('dataCollection.automatic.logs')}</strong></li>
              <li><strong>{s('dataCollection.automatic.cookies')}</strong></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('dataUsage.title')}</h2>
            <p>{s('dataUsage.intro')}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{s('dataUsage.purposes.service')}</li>
              <li>{s('dataUsage.purposes.account')}</li>
              <li>{s('dataUsage.purposes.payments')}</li>
              <li>{s('dataUsage.purposes.messages')}</li>
              <li>{s('dataUsage.purposes.support')}</li>
              <li>{s('dataUsage.purposes.analytics')}</li>
              <li>{s('dataUsage.purposes.security')}</li>
              <li>{s('dataUsage.purposes.legal')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('legalBasis.title')}</h2>
            <p>{s('legalBasis.intro')}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('legalBasis.contract')}</strong></li>
              <li><strong>{s('legalBasis.consent')}</strong></li>
              <li><strong>{s('legalBasis.interest')}</strong></li>
              <li><strong>{s('legalBasis.obligation')}</strong></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('sharing.title')}</h2>
            <p>{s('sharing.intro')}</p>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('sharing.providers.title')}</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('sharing.providers.supabase')}</strong></li>
              <li><strong>{s('sharing.providers.vercel')}</strong></li>
              <li><strong>{s('sharing.providers.stripe')}</strong></li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('sharing.legal.title')}</h3>
            <p>{s('sharing.legal.content')}</p>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('sharing.transfers.title')}</h3>
            <p>{s('sharing.transfers.content')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('storage.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">{s('storage.location.title')}</h3>
            <p>{s('storage.location.content')}</p>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('storage.duration.title')}</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('storage.duration.active')}</strong></li>
              <li><strong>{s('storage.duration.closed')}</strong></li>
              <li><strong>{s('storage.duration.logs')}</strong></li>
              <li><strong>{s('storage.duration.invoices')}</strong></li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">{s('storage.security.title')}</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>{s('storage.security.https')}</li>
              <li>{s('storage.security.passwords')}</li>
              <li>{s('storage.security.rls')}</li>
              <li>{s('storage.security.updates')}</li>
              <li>{s('storage.security.access')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('rights.title')}</h2>
            <p>{s('rights.intro')}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('rights.access')}</strong></li>
              <li><strong>{s('rights.rectification')}</strong></li>
              <li><strong>{s('rights.erasure')}</strong></li>
              <li><strong>{s('rights.portability')}</strong></li>
              <li><strong>{s('rights.objection')}</strong></li>
              <li><strong>{s('rights.restriction')}</strong></li>
              <li><strong>{s('rights.withdraw')}</strong></li>
            </ul>
            <p className="mt-4">
              {s('rights.contact')}{' '}
              <a href="mailto:privacy@lekbanken.no" className="text-primary hover:underline">
                privacy@lekbanken.no
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('cookies.title')}</h2>
            <p>{s('cookies.intro')}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{s('cookies.necessary')}</strong></li>
              <li><strong>{s('cookies.functional')}</strong></li>
              <li><strong>{s('cookies.analytics')}</strong></li>
            </ul>
            <p className="mt-4">{s('cookies.manage')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('children.title')}</h2>
            <p>{s('children.content')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('changes.title')}</h2>
            <p>{s('changes.content')}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('contact.title')}</h2>
            <p>{s('contact.intro')}</p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>{s('contact.email')}</strong></li>
              <li><strong>{s('contact.address')}</strong></li>
              <li><strong>{s('contact.dpo')}</strong></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{s('complaints.title')}</h2>
            <p>{s('complaints.intro')}</p>
            <ul className="list-none space-y-2 mt-4">
              <li>
                <strong>{s('complaints.website')}</strong>{' '}
                <a href="https://www.datatilsynet.no" className="text-primary hover:underline">
                  www.datatilsynet.no
                </a>
              </li>
              <li><strong>{s('complaints.email')}</strong></li>
            </ul>
          </section>
        </>
      )}

      <div className="not-prose mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {p('footer')}{' '}
          <Link href="/legal/terms" className="text-primary hover:underline">
            {t('links.terms')}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
