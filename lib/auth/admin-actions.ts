'use server'

import type { User } from '@supabase/supabase-js'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdminFromUser } from '@/lib/auth/role'

export type CurrentAdminUserResult = {
  user: User | null
  isSystem: boolean
  error: string | null
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUserResult> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, isSystem: false, error: 'Inte autentiserad' }
  }

  return {
    user,
    isSystem: isSystemAdminFromUser(user),
    error: null,
  }
}

export async function checkIsSystemAdmin(): Promise<boolean> {
  const { isSystem } = await getCurrentAdminUser()
  return isSystem
}