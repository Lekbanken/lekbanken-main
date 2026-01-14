import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { getPendingLegalDocuments } from '@/lib/legal/acceptance'
import { acceptLegalDocuments } from '@/app/actions/legal'
import { LegalAcceptWizard } from '@/components/legal/LegalAcceptWizard'

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

  // Transform pending docs to the wizard format
  const documents = pendingDocs.map(doc => ({
    id: doc.id,
    title: doc.title,
    content_markdown: doc.content_markdown,
    version_int: doc.version_int,
    type: doc.type,
  }))

  return (
    <LegalAcceptWizard
      documents={documents}
      redirectTo={redirectTo}
      onAccept={acceptLegalDocuments}
    />
  )
}
