'use server'

import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { readTenantIdFromCookies, setTenantCookie, clearTenantCookie } from '@/lib/utils/tenantCookie'
import type { Database } from '@/types/supabase'

type TenantRow = Database['public']['Tables']['tenants']['Row']
type TenantRole = 'owner' | 'admin' | 'editor' | 'member'
type TenantWithMembership = TenantRow & { membership: { tenant_id: string; role: TenantRole; is_primary?: boolean } }
export async function resolveCurrentTenant() {
  const cookieStore = await cookies()
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    clearTenantCookie(cookieStore)
    return { tenant: null as TenantWithMembership | null, role: null as TenantRole | null, tenants: [] as TenantWithMembership[] }
  }

  const tenantIdFromCookie = await readTenantIdFromCookies(cookieStore)

  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role, is_primary, status, tenant:tenants(*)')
    .eq('user_id', user.id)
    .or('status.eq.active,status.is.null')

  const validMemberships =
    memberships?.filter((m): m is typeof m & { tenant: NonNullable<typeof m['tenant']> } => !!m.tenant) ?? []

  const chooseTenant = () => {
    // 1. Cookie match (user's explicit previous choice)
    if (tenantIdFromCookie) {
      const match = validMemberships.find((m) => m.tenant_id === tenantIdFromCookie)
      if (match) return match
    }
    // 2. Deterministic fallback: is_primary first, then stable tenant_id sort
    const sorted = [...validMemberships].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      const aId = a.tenant_id ?? ''
      const bId = b.tenant_id ?? ''
      return aId < bId ? -1 : aId > bId ? 1 : 0
    })
    return sorted[0] ?? null
  }

  const selected = chooseTenant()

  // Dev-only: log resolution source for tenant debugging
  if (process.env.NODE_ENV === 'development') {
    const source = selected
      ? selected.tenant_id === tenantIdFromCookie ? 'cookie' : selected.is_primary ? 'primary' : 'fallback'
      : 'none'
    console.debug('[resolveCurrentTenant]', {
      source,
      tenantId: selected?.tenant_id ?? null,
      cookieHad: tenantIdFromCookie ?? null,
      totalMemberships: validMemberships.length,
    })
  }

  if (selected?.tenant_id) {
    await setTenantCookie(cookieStore, selected.tenant_id)
  } else {
    clearTenantCookie(cookieStore)
  }

  // Global admin fallback
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const resolvedRole = selected?.role ?? profile?.role ?? null

  return {
    tenant: selected ? ({ ...selected.tenant, membership: { tenant_id: selected.tenant_id, role: selected.role } } as TenantWithMembership) : null,
    role: resolvedRole as TenantRole | null,
    tenants: validMemberships.map(
      (m) =>
        ({
          ...m.tenant,
          membership: { tenant_id: m.tenant_id, role: m.role, is_primary: m.is_primary },
        } as TenantWithMembership)
    ),
  }
}

export async function selectTenant(tenantId: string) {
  const cookieStore = await cookies()
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    clearTenantCookie(cookieStore)
    return { tenant: null, role: null }
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role, tenant:tenants(*)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!membership?.tenant) {
    clearTenantCookie(cookieStore)
    return { tenant: null, role: null }
  }

  await setTenantCookie(cookieStore, tenantId)

  return {
    tenant: { ...membership.tenant, membership: { tenant_id: tenantId, role: membership.role } } as TenantWithMembership,
    role: membership.role as TenantRole,
  }
}

/**
 * Clear tenant selection - allows system admins to work without a tenant context
 */
export async function clearTenantSelection() {
  const cookieStore = await cookies()
  clearTenantCookie(cookieStore)
  return { tenant: null, role: null }
}
