import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { AdminDashboardPage } from "@/features/admin/dashboard/AdminDashboardPage";

export default async function AdminDashboard() {
  const authContext = await getServerAuthContext('/admin')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin')
  }

  if (authContext.effectiveGlobalRole !== 'system_admin') {
    const tenantId = authContext.activeTenant?.id ?? authContext.memberships?.[0]?.tenant_id ?? null
    if (tenantId) {
      redirect(`/admin/tenant/${tenantId}`)
    }
    redirect('/app/select-tenant')
  }

  return <AdminDashboardPage />;
}
