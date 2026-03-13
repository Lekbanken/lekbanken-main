import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const baseItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  currency_id: z.string().uuid(),
  quantity_limit: z.number().int().positive().nullable().optional(),
  is_featured: z.boolean().optional(),
  image_url: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

type ShopItemRow = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: string
  image_url: string | null
  price: number
  currency_id: string
  quantity_limit: number | null
  quantity_sold: number
  is_available: boolean
  is_featured: boolean
  sort_order: number
  created_by_user_id: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

const createSchema = z.object({
  tenantId: z.string().uuid(),
  item: baseItemSchema,
})

const patchSchema = z.object({
  tenantId: z.string().uuid(),
  itemId: z.string().uuid(),
  updates: baseItemSchema.partial(),
})

export const POST = apiHandler({
  auth: 'user',
  input: createSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, item } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    const { data, error } = await admin
      .from('shop_items')
      .insert({
        tenant_id: tenantId,
        created_by_user_id: auth!.user!.id,
        name: item.name,
        description: item.description ?? null,
        category: item.category,
        image_url: item.image_url ?? null,
        price: item.price,
        currency_id: item.currency_id,
        quantity_limit: item.quantity_limit ?? null,
        is_featured: item.is_featured ?? false,
        is_available: item.is_available ?? true,
        sort_order: item.sort_order ?? 0,
        metadata: ((item.metadata ?? {}) as unknown as Json),
      })
      .select('*')
      .single()

    if (error) {
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
      return NextResponse.json({ error: 'Failed to create item', details: message }, { status: 500 })
    }

    return NextResponse.json({ item: data as ShopItemRow }, { status: 200 })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  input: patchSchema,
  handler: async ({ body }) => {
    const { tenantId, itemId, updates } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const key of Object.keys(updates)) {
      const value = (updates as Record<string, unknown>)[key]
      if (value === undefined) continue
      patch[key] = value
    }

    const { data, error } = await admin.from('shop_items').update(patch).eq('id', itemId).eq('tenant_id', tenantId).select('*').single()

    if (error) {
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
      return NextResponse.json({ error: 'Failed to update item', details: message }, { status: 500 })
    }

    return NextResponse.json({ item: data as ShopItemRow }, { status: 200 })
  },
})
