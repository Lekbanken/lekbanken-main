import type { Database } from '@/types/supabase'

export type TenantRole = Database['public']['Enums']['tenant_role_enum']
export type Tenant = Database['public']['Tables']['tenants']['Row']

// Membership row, optionally hydrated with tenant
export type TenantMembership = Database['public']['Tables']['user_tenant_memberships']['Row'] & {
  tenant?: Tenant | null
}

export type TenantWithMembership = Tenant & {
  membership: {
    tenant_id: string
    role: TenantRole
    is_primary?: boolean | null
    status?: string | null
  }
}

export type TenantResolution = {
  tenantId: string | null
  source: 'path' | 'cookie' | 'membership' | 'auto' | 'none'
  redirect?: string
  clearCookie?: boolean
}
