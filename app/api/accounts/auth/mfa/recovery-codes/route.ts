import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { randomBytes, createHash } from 'crypto'
import { logRecoveryCodesGenerated } from '@/lib/services/mfa/mfaAudit.server'
import type { SupabaseClient } from '@supabase/supabase-js'

const RECOVERY_CODE_COUNT = 10

/**
 * Generate recovery codes in XXXX-XXXX-XX format
 */
function generateCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }).map(() => {
    const code = randomBytes(5).toString('hex').toUpperCase()
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`
  })
}

/**
 * Hash codes for storage (normalize first)
 */
function hashCodes(codes: string[]): string[] {
  return codes.map((code) => {
    const normalized = code.replace(/-/g, '').toUpperCase()
    return createHash('sha256').update(normalized).digest('hex')
  })
}

export async function POST() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const codes = generateCodes()
  const hashed = hashCodes(codes)

  // Get user's tenant for audit logging (cast to bypass type issues until regenerated)
  const db = supabase as unknown as SupabaseClient
  const { data: userMfa } = await db
    .from('user_mfa')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const tenantId = (userMfa as { tenant_id?: string } | null)?.tenant_id

  const { error } = await db
    .from('user_mfa')
    .upsert(
      {
        user_id: user.id,
        recovery_codes_hashed: hashed,
        recovery_codes_count: RECOVERY_CODE_COUNT,
        recovery_codes_used: 0,
        recovery_codes_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[mfa/recovery-codes] upsert error', error)
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  }

  // Log the generation
  await logRecoveryCodesGenerated(user.id, RECOVERY_CODE_COUNT, tenantId)

  return NextResponse.json({
    recovery_codes: codes,
    count: codes.length,
    message: 'Store these codes securely. Each code can only be used once.',
  })
}
