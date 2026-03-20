import 'server-only'

import type { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant/resolver'
import { clearTenantCookie, setTenantCookie } from '@/lib/utils/tenantCookie'
import type { TenantMembership, TenantWithMembership } from '@/types/tenant'

type CookieStore = Awaited<ReturnType<typeof cookies>>

type FinalizeLoginTenantParams = {
  cookieStore: CookieStore
  hostname?: string | null
  pathname?: string | null
}

export async function finalizeLoginTenant({
  cookieStore,
  hostname,
  pathname,
}: FinalizeLoginTenantParams): Promise<{
  tenant: TenantWithMembership | null
}> {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    clearTenantCookie(cookieStore, { hostname })
    return { tenant: null }
  }

  const { data: membershipsResult } = await supabase
    .from('user_tenant_memberships')
    .select('*, tenant:tenants(*)')
    .eq('user_id', user.id)
    .or('status.eq.active,status.is.null')

  const memberships = (membershipsResult as TenantMembership[] | null) ?? []
  const { tenant } = await resolveTenant({
    pathname,
    cookieStore,
    memberships,
  })

  if (tenant?.id) {
    await setTenantCookie(cookieStore, tenant.id, { hostname })
  } else {
    clearTenantCookie(cookieStore, { hostname })
  }

  return {
    tenant,
  }
}