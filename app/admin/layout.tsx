import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { TenantProvider } from '@/lib/context/TenantContext'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { AdminShellV2 } from '@/components/admin/AdminShellV2'
import { ToastProvider } from '@/components/ui'
import { getSystemDesign } from '@/lib/design'
import { getPendingLegalDocuments } from '@/lib/legal/acceptance'

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

  const locale = await getLocale()
  const pendingLegal = await getPendingLegalDocuments(authContext.user.id, locale as 'sv' | 'no' | 'en')
  if (pendingLegal.length > 0) {
    redirect('/legal/accept?redirect=/admin')
  }

  // Fetch system design for branding
  const systemDesign = await getSystemDesign()

  return (
    <TenantProvider
      userId={authContext.user.id}
      initialTenant={authContext.activeTenant}
      initialRole={authContext.activeTenantRole}
      initialMemberships={authContext.memberships}
      isSystemAdmin={isSystemAdmin}
    >
      <ToastProvider>
        <AdminShellV2 systemDesign={systemDesign}>{children}</AdminShellV2>
      </ToastProvider>
    </TenantProvider>
  )
}
