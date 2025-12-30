import type { User } from '@supabase/supabase-js'
import type { GlobalRole, UserProfile } from '@/types/auth'

function mapLegacyAdminRoleToSystemAdmin(role: string | null | undefined): GlobalRole | null {
  if (!role) return null
  if (role === 'system_admin') return 'system_admin'
  if (role === 'superadmin' || role === 'admin') return 'system_admin'
  return null
}

export function deriveEffectiveGlobalRoleFromUser(user: User | null): GlobalRole | null {
  if (!user) return null

  const claimRole = (user.app_metadata?.role as string | undefined) ?? null
  const mapped = mapLegacyAdminRoleToSystemAdmin(claimRole)
  if (mapped) return mapped

  const globalRole =
    (user.app_metadata?.global_role as GlobalRole | undefined) ??
    (user.user_metadata?.global_role as GlobalRole | undefined) ??
    null

  return globalRole ?? null
}

export function deriveEffectiveGlobalRole(
  profile: Partial<Pick<UserProfile, 'global_role' | 'role'>> | null,
  user: User | null
): GlobalRole | null {
  if (profile?.global_role) return profile.global_role as GlobalRole

  const fromUser = deriveEffectiveGlobalRoleFromUser(user)
  if (fromUser) return fromUser

  const legacyProfileRole = (profile?.role as string | undefined) ?? null
  return mapLegacyAdminRoleToSystemAdmin(legacyProfileRole)
}
