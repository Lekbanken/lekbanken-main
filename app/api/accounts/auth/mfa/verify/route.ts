import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { factor_id?: string; code?: string }
  if (!body.factor_id || !body.code) {
    return NextResponse.json({ errors: ['factor_id and code are required'] }, { status: 400 })
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: body.factor_id,
    code: body.code,
  })

  if (error) {
    console.error('[mfa/verify] verify error', error)
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  const { error: mfaErr } = await supabase
    .from('user_mfa')
    .upsert(
      {
        user_id: user.id,
        enrolled_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (mfaErr) {
    console.error('[mfa/verify] upsert error', mfaErr)
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'mfa_verified',
    payload: { factor_id: body.factor_id },
  })

  return NextResponse.json({ success: true })
}
