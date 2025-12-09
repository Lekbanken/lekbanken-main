import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { buildPlayView, DEFAULT_LOCALE_ORDER } from '@/lib/services/planner.server'
import type { Tables } from '@/types/supabase'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function GET(
  _request: NextRequest,
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

  type PlanWithRelations = Tables<'plans'> & {
    blocks?: (Tables<'plan_blocks'> & {
      game?: Tables<'games'> & {
        translations?: Tables<'game_translations'>[] | null
        media?: Tables<'game_media'>[] | null
      } | null
    })[] | null
  }

  const play = buildPlayView(data as PlanWithRelations, DEFAULT_LOCALE_ORDER)
  return NextResponse.json({ play })
}
