import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'

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

export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = getSchema.safeParse({ tenantId: searchParams.get('tenantId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId } = parsed.data

  if (!isSystemAdmin(user)) {
    const ok = await requireTenantMembership(supabase, tenantId, user.id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('leader_profile')
    .select('display_achievement_ids')
    .eq('user_id', user.id)
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
    .select('id,name,description,icon_url')
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
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, achievementIds } = parsed.data
  const uniqueIds = Array.from(new Set(achievementIds))

  if (!isSystemAdmin(user)) {
    const ok = await requireTenantMembership(supabase, tenantId, user.id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: upsertError } = await supabase
    .from('leader_profile')
    .upsert(
      {
        user_id: user.id,
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
}
