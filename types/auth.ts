import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { TenantMembership, TenantRole, TenantWithMembership } from '@/types/tenant'

export type GlobalRole = Database['public']['Enums']['global_role_enum']
export type UserProfile = Database['public']['Tables']['users']['Row']

export interface AuthContext {
  user: User | null
  profile: UserProfile | null
  effectiveGlobalRole: GlobalRole | null
  memberships: TenantMembership[]
  activeTenant: TenantWithMembership | null
  activeTenantRole: TenantRole | null
}
