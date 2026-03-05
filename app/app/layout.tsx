import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { getPendingLegalDocuments } from '@/lib/legal/cached-legal'
import AppShellContent from './layout-client'

type Props = {
  children: ReactNode
}

export default async function AppShell({ children }: Props) {
  const authContext = await getServerAuthContext('/app')

  if (!authContext.user) {
    // If auth is degraded (middleware timeout / network error), the session
    // may still be valid — don't redirect to login. The client-side
    // AuthProvider will resolve the real auth state and handle it.
    // Redirecting here during degradation causes the "page disconnection"
    // symptom where a transient failure looks like a logout.
    if (!authContext.authDegraded) {
      redirect('/auth/login?redirect=/app')
    }
    // authDegraded + no user: render shell with empty defaults.
    // Client-side AuthProvider will hydrate the real auth state.
    return (
      <TenantProvider
        userId={null}
        initialTenant={null}
        initialRole={null}
        initialMemberships={[]}
        isSystemAdmin={false}
      >
        <AppShellContent>{children}</AppShellContent>
      </TenantProvider>
    )
  }

  const locale = await getLocale()
  const pendingLegal = await getPendingLegalDocuments(authContext.user.id, locale as 'sv' | 'no' | 'en')
  if (pendingLegal.length > 0) {
    redirect('/legal/accept?redirect=/app')
  }

  const memberships = authContext.memberships || []
  const activeTenant = authContext.activeTenant
  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'

  return (
    <TenantProvider
      userId={authContext.user.id}
      initialTenant={activeTenant}
      initialRole={authContext.activeTenantRole}
      initialMemberships={memberships}
      isSystemAdmin={isSystemAdmin}
    >
      <AppShellContent>{children}</AppShellContent>
    </TenantProvider>
  )
}
