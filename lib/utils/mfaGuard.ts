import { createServerRlsClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Optional MFA enforcement helper.
 * If MFA_ENFORCE_SYSTEM_ADMIN === 'true', system_admin users must have user_mfa.enrolled_at set.
 * Returns { ok: boolean, reason?: string } so callers can decide whether to block.
 */
export async function requireMfaIfEnabled() {
  const enforce = process.env.MFA_ENFORCE_SYSTEM_ADMIN === 'true'
  if (!enforce) return { ok: true }

  const supabase = await createServerRlsClient()
  const db = supabase as unknown as SupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthorized' }

  const { data: userRow } = await db
    .from('users')
    .select('global_role')
    .eq('id', user.id)
    .maybeSingle()

  const isSystem = user.app_metadata?.role === 'system_admin' || userRow?.global_role === 'system_admin'
  if (!isSystem) return { ok: true }

  const { data: mfaRow } = await db
    .from('user_mfa')
    .select('enrolled_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mfaRow?.enrolled_at) {
    return { ok: false, reason: 'mfa_required' }
  }

  return { ok: true }
}
