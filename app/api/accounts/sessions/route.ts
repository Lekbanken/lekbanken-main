import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('[accounts/sessions] list error', error)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }

  return NextResponse.json({ sessions: data ?? [] })
}
