import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { factor_id?: string }
  if (!body.factor_id) {
    return NextResponse.json({ errors: ['factor_id is required'] }, { status: 400 })
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: body.factor_id })
  if (error) {
    console.error('[mfa/disable] unenroll error', error)
    return NextResponse.json({ error: 'Failed to disable factor' }, { status: 400 })
  }

  const { error: mfaErr } = await supabase
    .from('user_mfa')
    .update({ enforced_reason: null })
    .eq('user_id', user.id)
  if (mfaErr) {
    console.error('[mfa/disable] update error', mfaErr)
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'mfa_disabled',
    payload: { factor_id: body.factor_id },
  })

  return NextResponse.json({ success: true })
}
