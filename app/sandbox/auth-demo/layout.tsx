import type { ReactNode } from 'react'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'

export default async function AuthDemoLayout({ children }: { children: ReactNode }) {
  const authContext = await getServerAuthContext('/sandbox/auth-demo')

  return (
    <TenantProvider
      userId={authContext.user?.id ?? null}
      initialTenant={authContext.activeTenant}
      initialRole={authContext.activeTenantRole}
      initialMemberships={authContext.memberships}
    >
      {children}
    </TenantProvider>
  )
}
