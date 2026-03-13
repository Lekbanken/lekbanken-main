import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth'

export const dynamic = 'force-dynamic'

const updateCardSchema = z.object({
  sort_order: z.number().int().optional(),
  card_title: z.string().nullable().optional(),
  primary_prompt: z.string().min(1).optional(),
  followup_1: z.string().nullable().optional(),
  followup_2: z.string().nullable().optional(),
  followup_3: z.string().nullable().optional(),
  leader_tip: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
})

async function requireWriteAccessForCard(
  admin: ReturnType<typeof createServiceRoleClient>,
  ctx: AuthContext,
  cardId: string
) {
  const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

  const { data: card, error: cardError } = await admin
    .from('conversation_cards')
    .select('id,collection_id')
    .eq('id', cardId)
    .maybeSingle()

  if (cardError) throw cardError
  if (!card) return { card: null, collection: null }

  const { data: collection, error: colError } = await admin
    .from('conversation_card_collections')
    .select('id,scope_type,tenant_id')
    .eq('id', card.collection_id)
    .maybeSingle()

  if (colError) throw colError
  if (!collection) return { card: null, collection: null }

  if (collection.scope_type === 'global') {
    if (!isSystemAdmin) return { card: null, collection: null, forbidden: true }
  } else {
    if (!collection.tenant_id) return { card: null, collection: null, forbidden: true }
    await requireTenantRole(['owner', 'admin'], collection.tenant_id)
  }

  return { card, collection }
}

export const PATCH = apiHandler({
  auth: 'user',
  input: updateCardSchema,
  handler: async ({ auth, body: input, params }) => {
    const cardId = params.cardId

    const admin = createServiceRoleClient()

    const access = await requireWriteAccessForCard(admin, auth!, cardId)
    if ((access as { forbidden?: true }).forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!access.card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order
    if (input.card_title !== undefined) updates.card_title = input.card_title?.trim() ?? null
    if (input.primary_prompt !== undefined) updates.primary_prompt = input.primary_prompt.trim()
    if (input.followup_1 !== undefined) updates.followup_1 = input.followup_1?.trim() ?? null
    if (input.followup_2 !== undefined) updates.followup_2 = input.followup_2?.trim() ?? null
    if (input.followup_3 !== undefined) updates.followup_3 = input.followup_3?.trim() ?? null
    if (input.leader_tip !== undefined) updates.leader_tip = input.leader_tip?.trim() ?? null
    if (input.metadata !== undefined) updates.metadata = (input.metadata ?? {}) as unknown

    const { data: card, error } = await admin
      .from('conversation_cards')
      .update(updates)
      .eq('id', cardId)
      .select('id,collection_id,sort_order,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip,metadata,created_at,updated_at')
      .single()

    if (error || !card) {
      console.error('[admin/conversation-cards] update card error', error)
      return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
    }

    return NextResponse.json({ card })
  },
})

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const cardId = params.cardId

    const admin = createServiceRoleClient()

    const access = await requireWriteAccessForCard(admin, auth!, cardId)
    if ((access as { forbidden?: true }).forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!access.card) return NextResponse.json({ ok: true, missing: true })

    const { error } = await admin.from('conversation_cards').delete().eq('id', cardId)
    if (error) {
      console.error('[admin/conversation-cards] delete card error', error)
      return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  },
})
