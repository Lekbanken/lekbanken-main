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

  const body = (await request.json().catch(() => ({}))) as { device_id?: string }
  if (!body.device_id) return NextResponse.json({ errors: ['device_id is required'] }, { status: 400 })

  const loose = supabase as unknown as LooseSupabase
  const { error } = await loose.from('user_devices').delete().eq('id', body.device_id).eq('user_id', user.id)
  if (error) {
    console.error('[accounts/devices/remove] delete error', error)
    return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'device_removed',
    payload: { device_id: body.device_id },
  })

  return NextResponse.json({ success: true })
}
