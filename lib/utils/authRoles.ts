import type { Database } from '@/types/supabase'

type SupabaseUser = {
  id: string
  app_metadata?: { role?: string }
}

type TenantRole = Database['public']['Enums']['tenant_role_enum']
type GlobalRole = string

export function isSystemAdmin(user?: SupabaseUser | null, globalRole?: GlobalRole | null) {
  if (!user) return false
  const metaRole = user.app_metadata?.role
  return metaRole === 'system_admin' || globalRole === 'system_admin'
}

export function isDemoUser(globalRole?: GlobalRole | null) {
  return globalRole === 'demo_private_user'
}

export function isTenantAdmin(role?: TenantRole | null) {
  return role === 'owner' || role === 'admin'
}

export function isTenantEditor(role?: TenantRole | null) {
  return role === 'editor' || isTenantAdmin(role)
}

export function isTenantMember(role?: TenantRole | null) {
  return Boolean(role)
}

export const permissionMatrix = {
  global: {
    system_admin: ['*'],
    private_user: ['self'],
    demo_private_user: ['demo'],
    member: [],
  },
  tenant: {
    owner: ['admin', 'editor', 'member'],
    admin: ['admin', 'editor', 'member'],
    editor: ['editor', 'member'],
    member: ['member'],
    organisation_admin: ['admin', 'editor', 'member'],
    organisation_user: ['member'],
    demo_org_admin: ['admin', 'editor', 'member'],
    demo_org_user: ['member'],
  },
}

export function resolveTenantPermission(role?: TenantRole | null) {
  if (!role) return []
  return permissionMatrix.tenant[role] ?? []
}
