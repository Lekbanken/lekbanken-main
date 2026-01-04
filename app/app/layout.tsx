import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'
import AppShellContent from './layout-client'

type Props = {
  children: ReactNode
}

export default async function AppShell({ children }: Props) {
  const authContext = await getServerAuthContext('/app')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/app')
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
