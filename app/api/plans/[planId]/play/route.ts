import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { buildPlayView, DEFAULT_LOCALE_ORDER } from '@/lib/services/planner.server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('plans')
    .select(
      `
        *,
        blocks:plan_blocks(
          *,
          game:games(
            *,
            translations:game_translations(*),
            media:game_media(*)
          )
        )
      `
    )
    .eq('id', planId)
    .order('position', { foreignTable: 'plan_blocks', ascending: true })
    .maybeSingle()

  if (error || !data) {
    console.error('[api/plans/:id/play] load error', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const play = buildPlayView(data as any, DEFAULT_LOCALE_ORDER)
  return NextResponse.json({ play })
}
