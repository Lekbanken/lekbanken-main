import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const REQUIRED_LEVEL = 2

const getSchema = z.object({
  tenantId: z.string().uuid(),
})

const postSchema = z.object({
  tenantId: z.string().uuid(),
  itemId: z.string().uuid(),
})

async function requireTenantMembership(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  tenantId: string,
  userId: string
) {
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return Boolean(membership)
}

function toUserLevel(level: unknown): number {
  return typeof level === 'number' && Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1
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

  const [cosmeticsRes, progressRes] = await Promise.all([
    supabase
      .from('player_cosmetics')
      .select('shop_item_id,is_equipped,shop_items(id,name,image_url,category)')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: false }),
    supabase
      .from('user_progress')
      .select('level')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
  ])

  if (cosmeticsRes.error) {
    return NextResponse.json({ error: 'Failed to load cosmetics' }, { status: 500 })
  }

  if (progressRes.error) {
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }

  const userLevel = toUserLevel((progressRes.data as { level?: unknown } | null)?.level)

  const items = (cosmeticsRes.data ?? [])
    .map((row) => {
      const shop = (row as { shop_items?: unknown }).shop_items
      const shopObj = shop && typeof shop === 'object' ? (shop as Record<string, unknown>) : null
      return {
        itemId: String((row as { shop_item_id?: unknown }).shop_item_id ?? ''),
        name: String(shopObj?.name ?? ''),
        imageUrl: (shopObj?.image_url as string | null | undefined) ?? null,
        category: String(shopObj?.category ?? ''),
        isEquipped: Boolean((row as { is_equipped?: unknown }).is_equipped ?? false),
      }
    })
    .filter((x) => x.itemId && x.category === 'cosmetic')

  const equippedItemId = items.find((i) => i.isEquipped)?.itemId ?? null

  return NextResponse.json(
    {
      tenantId,
      requiredLevel: REQUIRED_LEVEL,
      userLevel,
      equippedItemId,
      items: items.map(({ category: _category, ...rest }) => rest),
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

  const { tenantId, itemId } = parsed.data

  if (!isSystemAdmin(user)) {
    const ok = await requireTenantMembership(supabase, tenantId, user.id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('level')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (progressError) {
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }

  const userLevel = toUserLevel((progress as { level?: unknown } | null)?.level)

  if (userLevel < REQUIRED_LEVEL) {
    return NextResponse.json({ code: 'LEVEL_LOCKED', requiredLevel: REQUIRED_LEVEL }, { status: 403 })
  }

  const { data: owned } = await supabase
    .from('player_cosmetics')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('shop_item_id', itemId)
    .limit(1)
    .maybeSingle()

  if (!owned) {
    return NextResponse.json({ error: 'Not owned' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()

  const { error: resetError } = await supabase
    .from('player_cosmetics')
    .update({ is_equipped: false })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)

  if (resetError) {
    return NextResponse.json({ error: 'Failed to update loadout' }, { status: 500 })
  }

  const { data: updated, error: equipError } = await supabase
    .from('player_cosmetics')
    .update({ is_equipped: true, equipped_at: nowIso })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('shop_item_id', itemId)
    .select('shop_item_id')

  if (equipError) {
    return NextResponse.json({ error: 'Failed to equip' }, { status: 500 })
  }

  const didUpdate = (updated ?? []).length > 0
  if (!didUpdate) {
    return NextResponse.json({ error: 'Not owned' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, equippedItemId: itemId }, { status: 200 })
}
