import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { resolveTenant } from '@/lib/tenant/resolver'
import type { GlobalRole } from '@/types/auth'
import type { TenantMembership } from '@/types/tenant'
import { deriveEffectiveGlobalRoleFromUser } from '@/lib/auth/role'

export function deriveEffectiveGlobalRoleFromClaims(user: User | null): GlobalRole | null {
  return deriveEffectiveGlobalRoleFromUser(user)
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
