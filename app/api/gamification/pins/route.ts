import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

export const dynamic = 'force-dynamic'

const getSchema = z.object({
  tenantId: z.string().uuid(),
})

const postSchema = z.object({
  tenantId: z.string().uuid(),
  achievementIds: z.array(z.string().uuid()).max(3),
})

async function requireTenantMembership(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string, userId: string) {
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return Boolean(membership)
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req, auth }) => {
    const supabase = await createServerRlsClient()
    const userId = auth!.user!.id

    const { searchParams } = new URL(req.url)
    const parsed = getSchema.safeParse({ tenantId: searchParams.get('tenantId') })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
    }

    const { tenantId } = parsed.data

    if (auth!.effectiveGlobalRole !== 'system_admin') {
      const ok = await requireTenantMembership(supabase, tenantId, userId)
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('leader_profile')
      .select('display_achievement_ids')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (profileError) {
      console.error('[api/gamification/pins] load profile error', profileError)
      return NextResponse.json({ error: 'Failed to load pins' }, { status: 500 })
    }

    const pinnedIds = ((profile?.display_achievement_ids ?? []) as unknown as string[]).filter(Boolean)

    if (pinnedIds.length === 0) {
      return NextResponse.json({ tenantId, pinnedIds: [], achievements: [] }, { status: 200 })
    }

    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('id,name,description,icon_url,icon_config')
      .in('id', pinnedIds)

    if (achievementsError) {
      console.error('[api/gamification/pins] load achievements error', achievementsError)
      return NextResponse.json({ error: 'Failed to load pinned achievements' }, { status: 500 })
    }

    const byId = new Map((achievements ?? []).map((a) => [a.id as string, a]))
    const ordered = pinnedIds.map((id) => byId.get(id)).filter(Boolean)

    return NextResponse.json(
      {
        tenantId,
        pinnedIds,
        achievements: ordered,
      },
      { status: 200 }
    )
  },
})

export const POST = apiHandler({
  auth: 'user',
  input: postSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, achievementIds } = body
    const uniqueIds = Array.from(new Set(achievementIds))

    const supabase = await createServerRlsClient()
    const userId = auth!.user!.id

    if (auth!.effectiveGlobalRole !== 'system_admin') {
      const ok = await requireTenantMembership(supabase, tenantId, userId)
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: upsertError } = await supabase
      .from('leader_profile')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          display_achievement_ids: uniqueIds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tenant_id' }
      )

    if (upsertError) {
      console.error('[api/gamification/pins] save error', upsertError)
      return NextResponse.json({ error: 'Failed to save pins' }, { status: 500 })
    }

    return NextResponse.json({ tenantId, pinnedIds: uniqueIds }, { status: 200 })
  },
})
