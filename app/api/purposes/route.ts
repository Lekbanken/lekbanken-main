import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PurposeRow = Database['public']['Tables']['purposes']['Row']

export async function GET() {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[api/purposes] fetch error', error)
    return NextResponse.json({ error: 'Failed to load purposes' }, { status: 500 })
  }

  const items: PurposeRow[] = data ?? []
  return NextResponse.json({ purposes: items })
}
