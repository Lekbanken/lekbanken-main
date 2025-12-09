import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const loose = supabase as unknown as LooseSupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { session_id?: string }
  if (!body.session_id) {
    return NextResponse.json({ errors: ['session_id is required'] }, { status: 400 })
  }

  // Best-effort revoke via admin API
  try {
    await supabaseAdmin.auth.admin.signOut(body.session_id)
  } catch (err) {
    console.warn('[accounts/sessions/revoke] admin signOut warning', err)
  }

  const { error } = await loose
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('supabase_session_id', body.session_id)

  if (error) {
    console.error('[accounts/sessions/revoke] update error', error)
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'session_revoked',
    payload: { session_id: body.session_id },
  })

  return NextResponse.json({ success: true })
}
