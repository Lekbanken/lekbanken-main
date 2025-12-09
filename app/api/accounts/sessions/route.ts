import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const loose = supabase as unknown as LooseSupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await loose
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
