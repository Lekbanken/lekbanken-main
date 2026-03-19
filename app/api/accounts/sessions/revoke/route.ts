import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'
import { apiHandler } from '@/lib/api/route-handler'

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const user = auth!.user!
    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as { session_id?: string }
    if (!body.session_id) {
      return NextResponse.json({ errors: ['session_id is required'] }, { status: 400 })
    }

    // BUG-013: Auth revocation is the critical operation — if it fails, the session
    // remains valid in Supabase Auth. Do not mark as revoked locally unless auth succeeds.
    try {
      await supabaseAdmin.auth.admin.signOut(body.session_id)
    } catch (err) {
      console.error('[accounts/sessions/revoke] admin signOut failed', err)
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
    }

    const { error } = await supabase
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
  },
})
