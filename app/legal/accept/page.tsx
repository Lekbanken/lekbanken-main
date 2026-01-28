import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
  
  // Determine redirect URL, respecting demo subdomain for demo users
  let redirectTo = redirectParam.startsWith('/') ? redirectParam : '/app'
  
  // Check if user is a demo user - if so, ensure redirect goes to demo.lekbanken.no
  const isDemoUser = authContext.user.user_metadata?.is_demo_user === true
  if (isDemoUser && process.env.NODE_ENV === 'production') {
    // Get the current host to check if we're already on demo subdomain
    const headersList = await headers()
    const host = headersList.get('host') || ''
    
    // If not already on demo subdomain and redirect is relative, prepend demo subdomain
    if (!host.startsWith('demo.') && redirectTo.startsWith('/')) {
      redirectTo = `https://demo.lekbanken.no${redirectTo}`
    }
  }
  
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
