import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  // Get current pathname to prevent redirect loops
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
  const isNoAccessPage = pathname.includes('/no-access')
  const isSelectTenantPage = pathname.includes('/select-tenant')

  if (!activeTenant && !isNoAccessPage && !isSelectTenantPage) {
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
