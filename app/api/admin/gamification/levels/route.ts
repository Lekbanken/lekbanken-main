import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  tenantId: z.string().uuid(),
  levels: z.array(
    z.object({
      level: z.number().int().min(1),
      name: z.string().max(200).optional().nullable(),
      nextLevelXp: z.number().int().min(0),
      nextReward: z.string().max(200).optional().nullable(),
      rewardAssetKey: z.string().max(200).optional().nullable(),
    }),
  ),
})

/**
 * GET /api/admin/gamification/levels?tenantId=<uuid>
 * Returns effective level definitions (tenant override if present, else global).
 */
export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const tenantId = url.searchParams.get('tenantId')
  if (!tenantId || !z.string().uuid().safeParse(tenantId).success) {
    return NextResponse.json({ error: 'Invalid tenantId' }, { status: 400 })
  }

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('get_gamification_level_definitions_v1', { p_tenant_id: tenantId })
  if (error) {
    const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to load levels', details: msg }, { status: 500 })
  }

  return NextResponse.json({ tenantId, levels: data ?? [] }, { status: 200 })
}

/**
 * POST /api/admin/gamification/levels
 * Replaces tenant-scoped definitions for a tenant.
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, levels } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient()

  // Transform to DB-friendly keys.
  const payload = levels.map((l) => ({
    level: l.level,
    name: l.name ?? null,
    nextLevelXp: l.nextLevelXp,
    nextReward: l.nextReward ?? null,
    rewardAssetKey: l.rewardAssetKey ?? null,
  }))

  const { data, error } = await admin.rpc('replace_gamification_level_definitions_v1', {
    p_tenant_id: tenantId,
    p_levels: payload,
    p_actor_user_id: user.id,
  })

  if (error) {
    const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Save failed', details: msg }, { status: 500 })
  }

  const rows = Array.isArray(data) ? data : []
  const replacedCount = rows[0]?.replaced_count ?? payload.length

  return NextResponse.json({ tenantId, replacedCount }, { status: 200 })
}
