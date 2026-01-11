import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('legal.terms.metadata')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function TermsPage() {
  const t = await getTranslations('legal')
  const terms = await getTranslations('legal.terms')
  const s = await getTranslations('legal.terms.sections')

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

      <h1 className="text-4xl font-bold mb-4">{terms('title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('common.lastUpdated', { date: new Date().toLocaleDateString('sv-SE') })}
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('introduction.title')}</h2>
        <p>{s('introduction.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('usage.title')}</h2>
        
        <h3 className="text-xl font-semibold mb-2">{s('usage.eligibility.title')}</h3>
        <p>{s('usage.eligibility.content')}</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">{s('usage.security.title')}</h3>
        <p>{s('usage.security.content')}</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">{s('usage.acceptable.title')}</h3>
        <p>{s('usage.acceptable.intro')}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>{s('usage.acceptable.illegal')}</li>
          <li>{s('usage.acceptable.unauthorized')}</li>
          <li>{s('usage.acceptable.malware')}</li>
          <li>{s('usage.acceptable.harassment')}</li>
          <li>{s('usage.acceptable.spam')}</li>
          <li>{s('usage.acceptable.ip')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('content.title')}</h2>
        
        <h3 className="text-xl font-semibold mb-2">{s('content.yourContent.title')}</h3>
        <p>{s('content.yourContent.content')}</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">{s('content.ourContent.title')}</h3>
        <p>{s('content.ourContent.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('payment.title')}</h2>
        
        <h3 className="text-xl font-semibold mb-2">{s('payment.fees.title')}</h3>
        <p>{s('payment.fees.content')}</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">{s('payment.billing.title')}</h3>
        <p>{s('payment.billing.content')}</p>

        <h3 className="text-xl font-semibold mb-2 mt-4">{s('payment.refunds.title')}</h3>
        <p>{s('payment.refunds.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('termination.title')}</h2>
        <p>{s('termination.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('liability.title')}</h2>
        <p>{s('liability.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('changes.title')}</h2>
        <p>{s('changes.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('law.title')}</h2>
        <p>{s('law.content')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{s('contact.title')}</h2>
        <p>{s('contact.intro')}</p>
        <ul className="list-none space-y-2 mt-4">
          <li><strong>{s('contact.email')}</strong></li>
          <li><strong>{s('contact.address')}</strong></li>
        </ul>
      </section>

      <div className="not-prose mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {terms('footer')}{' '}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            {t('links.privacy')}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
