import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateGamePayload } from '@/lib/validation/games'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Basic role gate: require admin/owner for publish
  const role = (user.app_metadata as { role?: string })?.role || null
  if (role !== 'admin' && role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: publish requires admin/owner' }, { status: 403 })
  }
  const body = (await request.json().catch(() => ({}))) as {
    hasCoverImage?: boolean
    force?: boolean
  }

  const validation = validateGamePayload({ hasCoverImage: body.hasCoverImage }, { mode: 'publish' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Require at least one cover image before publish
  const { data: covers, error: coverError } = await supabase
    .from('game_media')
    .select('id')
    .eq('game_id', gameId)
    .eq('kind', 'cover')

  if (coverError) {
    console.error('[api/games/:id/publish] cover check error', coverError)
    return NextResponse.json({ error: 'Failed to verify media' }, { status: 500 })
  }

  if (!covers || covers.length === 0) {
    return NextResponse.json({ error: 'Cover image required before publish' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('games')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .select()
    .single()

  if (error) {
    console.error('[api/games/:id/publish] publish error', error)
    return NextResponse.json({ error: 'Failed to publish game' }, { status: 500 })
  }

  return NextResponse.json({ game: data })
}
