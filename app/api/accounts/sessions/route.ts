import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth }) => {
    const supabase = await createServerRlsClient()
    // BUG-010: Select only columns that exist on user_sessions
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, user_id, user_agent, ip, last_login_at, last_seen_at, device_id')
      .eq('user_id', auth!.user!.id)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('[accounts/sessions] list error', error)
      return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions: data ?? [] })
  },
})
