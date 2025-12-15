import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { resolveTenant } from '@/lib/tenant/resolver'
import type { GlobalRole } from '@/types/auth'
import type { TenantMembership } from '@/types/tenant'

export function deriveEffectiveGlobalRoleFromClaims(user: User | null): GlobalRole | null {
  const claimRole = (user?.app_metadata?.role as string | undefined) ?? null
  if (claimRole === 'system_admin') return 'system_admin'
  if (claimRole === 'superadmin' || claimRole === 'admin') return 'system_admin'

  const globalRole =
    (user?.app_metadata?.global_role as GlobalRole | undefined) ??
    (user?.user_metadata?.global_role as GlobalRole | undefined) ??
    null

  return globalRole ?? null
}

export function resolveTenantForMiddlewareRequest(request: NextRequest, memberships: TenantMembership[]) {
  const suppressNoAccessRedirect = memberships.length === 0
  return resolveTenant(
    {
      pathname: request.nextUrl.pathname,
      cookieStore: request.cookies,
      memberships,
    },
    { suppressNoAccessRedirect }
  )
}
