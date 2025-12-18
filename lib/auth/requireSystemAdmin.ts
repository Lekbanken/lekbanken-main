import { redirect } from 'next/navigation'
import { getServerAuthContext } from '@/lib/auth/server-context'

/**
 * Server-side guard for system-admin-only admin pages.
 * Redirects non-system-admin users back to /admin (which will tenant-redirect if applicable).
 */
export async function requireSystemAdmin(redirectTo: string = '/admin') {
  const authContext = await getServerAuthContext('/admin')

  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin')
  }

  if (authContext.effectiveGlobalRole !== 'system_admin') {
    redirect(redirectTo)
  }

  return authContext
}
