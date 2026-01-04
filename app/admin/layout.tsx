import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { AdminShellV2 } from '@/components/admin/AdminShellV2'
import { ToastProvider } from '@/components/ui'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authContext = await getServerAuthContext('/admin')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin')
  }

  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'
  const allowedTenantRoles = new Set(['owner', 'admin', 'editor'])
  const hasTenantAdminAccess = (authContext.memberships ?? []).some((m) =>
    allowedTenantRoles.has((m.role ?? 'member') as string)
  )

  if (!isSystemAdmin && !hasTenantAdminAccess) {
    redirect('/app')
  }

  return (
    <TenantProvider
      userId={authContext.user.id}
      initialTenant={authContext.activeTenant}
      initialRole={authContext.activeTenantRole}
      initialMemberships={authContext.memberships}
      isSystemAdmin={isSystemAdmin}
    >
      <ToastProvider>
        <AdminShellV2>{children}</AdminShellV2>
      </ToastProvider>
    </TenantProvider>
  )
}
