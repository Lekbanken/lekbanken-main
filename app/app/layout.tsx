import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'
import AppShellContent from './layout-client'

export default async function AppShell({ children }: { children: ReactNode }) {
  const authContext = await getServerAuthContext('/app')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/app')
  }

  const memberships = authContext.memberships || []
  const activeTenant = authContext.activeTenant

  if (!activeTenant) {
    if (memberships.length > 1) {
      redirect('/app/select-tenant')
    }
    if (memberships.length === 0) {
      redirect('/app/no-access')
    }
  }

  return (
    <TenantProvider
      userId={authContext.user.id}
      initialTenant={activeTenant}
      initialRole={authContext.activeTenantRole}
      initialMemberships={memberships}
    >
      <AppShellContent>{children}</AppShellContent>
    </TenantProvider>
  )
}
