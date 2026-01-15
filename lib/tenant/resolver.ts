import type { NextRequest } from 'next/server'
import type { TenantMembership, TenantResolution, TenantRole, TenantWithMembership } from '@/types/tenant'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'

type CookieReader = { get: (name: string) => { name: string; value: string } | undefined }

type ResolveTenantParams = {
  pathname?: string | null
  cookieStore: CookieReader
  memberships: TenantMembership[]
}

function extractTenantIdFromPath(pathname?: string | null) {
  if (!pathname) return null
  const match = pathname.match(/^\/app\/t\/([^/]+)/i)
  return match?.[1] ?? null
}

function toTenantWithMembership(member: TenantMembership | null | undefined): TenantWithMembership | null {
  if (!member || !member.tenant_id) return null
  if (!member.tenant) return null

  return {
    ...member.tenant,
    membership: {
      tenant_id: member.tenant_id,
      role: (member.role ?? 'member') as TenantRole,
      is_primary: member.is_primary,
      status: member.status ?? null,
    },
  }
}

export async function resolveTenant(
  params: ResolveTenantParams,
  options?: { suppressNoAccessRedirect?: boolean }
): Promise<{
  resolution: TenantResolution
  tenant: TenantWithMembership | null
  tenantRole: TenantRole | null
}> {
  const { pathname, cookieStore } = params
  const memberships = params.memberships || []

  const pathTenantId = extractTenantIdFromPath(pathname)
  const cookieTenantId = await readTenantIdFromCookies(cookieStore)

  const validMemberships = memberships.filter(
    (m) => m.tenant_id && (!m.status || m.status === 'active')
  )

  const findMembership = (tenantId: string | null | undefined) =>
    validMemberships.find((m) => m.tenant_id === tenantId)

  let source: TenantResolution['source'] = 'none'
  let clearCookie = false
  let redirect: string | undefined

  let selected: TenantMembership | undefined

  if (pathTenantId) {
    selected = findMembership(pathTenantId) || undefined
    source = 'path'
  }

  if (!selected && cookieTenantId) {
    selected = findMembership(cookieTenantId) || undefined
    source = 'cookie'
    if (!selected) {
      clearCookie = true
    }
  }

  if (!selected) {
    const primary = validMemberships.find((m) => m.is_primary)
    if (primary) {
      selected = primary
      source = 'membership'
    }
  }

  if (!selected && validMemberships.length === 1) {
    selected = validMemberships[0]
    source = 'membership'
  }

  if (!selected) {
    // Auto-select first available tenant instead of redirecting
    // Priority: is_primary first, then first in list
    if (validMemberships.length > 0) {
      const primaryFirst = [...validMemberships].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return 0
      })
      selected = primaryFirst[0]
      source = 'auto'
    } else if (!options?.suppressNoAccessRedirect) {
      redirect = '/app/no-access'
    }
    
    if (!selected) {
      return {
        resolution: { tenantId: null, source, redirect, clearCookie },
        tenant: null,
        tenantRole: null,
      }
    }
  }

  const tenant = toTenantWithMembership(selected)
  const tenantRole = (selected.role ?? null) as TenantRole | null

  return {
    resolution: {
      tenantId: selected.tenant_id!,
      source,
      clearCookie,
    },
    tenant,
    tenantRole,
  }
}

export function resolveTenantForMiddleware(request: NextRequest, memberships: TenantMembership[]) {
  return resolveTenant({
    pathname: request.nextUrl.pathname,
    cookieStore: request.cookies,
    memberships,
  })
}
