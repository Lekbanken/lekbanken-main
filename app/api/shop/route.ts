import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const getSchema = z.object({
  tenantId: z.string().uuid(),
})

const postSchema = z.object({
  tenantId: z.string().uuid(),
  itemId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
})

function currencyFromCode(code: unknown): 'coins' | 'gems' {
  const str = typeof code === 'string' ? code.toLowerCase() : ''
  if (str === 'gems' || str.startsWith('gems:') || str.includes('gems')) return 'gems'
  // Gamification-backed currency rows are tenant-scoped (e.g. dicecoin:<tenantId>)
  if (str.startsWith('dicecoin:')) return 'coins'
  if (str === 'coins' || str.startsWith('coins:') || str.includes('coin')) return 'coins'
  return 'coins'
}

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

function toNumberPrice(price: unknown): number {
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    const parsed = Number(price)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
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

  const nowIso = new Date().toISOString()

  const [coinsRes, itemsRes, ownedRes, purchasesRes, powerupsRes, boostRes, progressRes] = await Promise.all([
    supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('shop_items')
      .select('id,name,description,category,image_url,price,is_featured,metadata,virtual_currencies(code)')
      .eq('tenant_id', tenantId)
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('player_cosmetics')
      .select('shop_item_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id),
    supabase
      .from('user_purchases')
      .select('shop_item_id,quantity')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id),
    supabase
      .from('user_powerup_inventory')
      .select('shop_item_id,quantity')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id),
    supabase
      .from('user_powerup_effects')
      .select('multiplier,expires_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('effect_type', 'coin_multiplier')
      .lte('starts_at', nowIso)
      .gt('expires_at', nowIso)
      .order('multiplier', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_progress')
      .select('level')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
  ])

  if (coinsRes.error) {
    return NextResponse.json({ error: 'Failed to load balance' }, { status: 500 })
  }

  if (itemsRes.error) {
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
  }

  if (ownedRes.error) {
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }

  if (purchasesRes.error) {
    return NextResponse.json({ error: 'Failed to load purchases' }, { status: 500 })
  }

  if (powerupsRes.error) {
    return NextResponse.json({ error: 'Failed to load powerups' }, { status: 500 })
  }

  if (boostRes.error) {
    return NextResponse.json({ error: 'Failed to load boost' }, { status: 500 })
  }

  if (progressRes.error) {
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }

  const ownedCosmeticIds = (ownedRes.data ?? []).map((r) => String((r as { shop_item_id?: string }).shop_item_id))
  const purchasedItemIds = (purchasesRes.data ?? []).map((r) => String((r as { shop_item_id?: string }).shop_item_id))
  const ownedItemIds = Array.from(new Set([...ownedCosmeticIds, ...purchasedItemIds]))

  const ownedQuantitiesByItemId = (purchasesRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
    const id = String((row as { shop_item_id?: string }).shop_item_id ?? '')
    if (!id) return acc
    const qtyRaw = (row as { quantity?: unknown }).quantity
    const qty = typeof qtyRaw === 'number' ? qtyRaw : typeof qtyRaw === 'string' ? Number(qtyRaw) : 0
    acc[id] = (acc[id] ?? 0) + (Number.isFinite(qty) && qty > 0 ? qty : 1)
    return acc
  }, {})

  // For powerups, quantities should reflect remaining inventory (purchases - consumptions).
  for (const row of powerupsRes.data ?? []) {
    const id = String((row as { shop_item_id?: string }).shop_item_id ?? '')
    if (!id) continue
    const qtyRaw = (row as { quantity?: unknown }).quantity
    const qty = typeof qtyRaw === 'number' ? qtyRaw : typeof qtyRaw === 'string' ? Number(qtyRaw) : 0
    ownedQuantitiesByItemId[id] = Number.isFinite(qty) && qty > 0 ? qty : 0
  }

  const activeBoost = boostRes.data
    ? {
        multiplier: Number((boostRes.data as { multiplier?: unknown }).multiplier ?? 1),
        expiresAt: String((boostRes.data as { expires_at?: unknown }).expires_at ?? ''),
      }
    : null

  const items = (itemsRes.data ?? []).map((row) => {
    const metadata = (row as { metadata?: unknown }).metadata
    const meta = (metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {})
    const vc = (row as { virtual_currencies?: unknown }).virtual_currencies
    const currencyCode = (vc && typeof vc === 'object' ? (vc as Record<string, unknown>).code : undefined) as unknown

    const requiredLevelRaw = (meta.minLevel ?? meta.min_level) as unknown
    const requiredLevelNumber =
      typeof requiredLevelRaw === 'number'
        ? requiredLevelRaw
        : typeof requiredLevelRaw === 'string'
          ? Number(requiredLevelRaw)
          : NaN
    const requiredLevel =
      Number.isFinite(requiredLevelNumber) && requiredLevelNumber > 1
        ? Math.floor(requiredLevelNumber)
        : undefined

    return {
      id: String((row as { id: string }).id),
      name: String((row as { name: string }).name),
      description: (row as { description?: string | null }).description ?? '',
      category: String((row as { category: string }).category),
      price: Math.round(toNumberPrice((row as { price?: unknown }).price)),
      currency: currencyFromCode(currencyCode),
      imageUrl: (row as { image_url?: string | null }).image_url ?? undefined,
      rarity: (typeof meta.rarity === 'string' ? meta.rarity : 'common') as string,
      isNew: Boolean(meta.isNew ?? false),
      isFeatured: Boolean((row as { is_featured?: boolean | null }).is_featured ?? false),
      discount: typeof meta.discount === 'number' ? meta.discount : undefined,
      requiredLevel,
    }
  })

  const userLevelRaw = (progressRes.data as { level?: unknown } | null)?.level
  const userLevel = typeof userLevelRaw === 'number' && Number.isFinite(userLevelRaw) && userLevelRaw >= 1 ? userLevelRaw : 1

  return NextResponse.json(
    {
      tenantId,
      userLevel,
      coinBalance: (coinsRes.data as { balance?: number | null } | null)?.balance ?? 0,
      gemBalance: 0,
      ownedItemIds,
      ownedQuantitiesByItemId,
      activeBoost,
      items,
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

  const { tenantId, itemId, idempotencyKey } = parsed.data

  if (!isSystemAdmin(user)) {
    const ok = await requireTenantMembership(supabase, tenantId, user.id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createServiceRoleClient()

    const { data, error } = await admin.rpc('purchase_shop_item_v1', {
      p_user_id: user.id,
      p_tenant_id: tenantId,
      p_shop_item_id: itemId,
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
      const lower = message.toLowerCase()

      if (lower.includes('requires level')) {
        const match = message.match(/(\d+)/)
        const requiredLevel = match ? Number(match[1]) : null
        return NextResponse.json(
          { error: 'Purchase failed', code: 'LEVEL_LOCKED', requiredLevel: Number.isFinite(requiredLevel) ? requiredLevel : null },
          { status: 403 }
        )
      }

      const status = lower.includes('insufficient') ? 409 : 500
      return NextResponse.json({ error: 'Purchase failed', details: message }, { status })
    }

    const row = Array.isArray(data) ? data[0] : data
    return NextResponse.json(
      {
        purchaseId: row?.purchase_id ?? null,
        coinTransactionId: row?.coin_transaction_id ?? null,
        balance: row?.balance ?? null,
      },
      { status: 200 }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
