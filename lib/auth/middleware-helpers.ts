import type { User } from '@supabase/supabase-js'
import type { GlobalRole } from '@/types/auth'
import { deriveEffectiveGlobalRoleFromUser } from '@/lib/auth/role'

export function deriveEffectiveGlobalRoleFromClaims(user: User | null): GlobalRole | null {
  return deriveEffectiveGlobalRoleFromUser(user)
}
