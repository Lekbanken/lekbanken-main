import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireAuth, AuthError, requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

async function requireWriteAccessForCard(
  admin: ReturnType<typeof createServiceRoleClient>,
  ctx: Awaited<ReturnType<typeof requireAuth>>,
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const ctx = await requireAuth()
    const cardId = (await params).cardId

    const body = await req.json().catch(() => ({}))
    const parsed = updateCardSchema.safeParse(body)
    if (!parsed.success) return jsonError(400, 'Invalid payload', parsed.error.flatten())

    const admin = createServiceRoleClient()

    const access = await requireWriteAccessForCard(admin, ctx, cardId)
    if ((access as { forbidden?: true }).forbidden) return jsonError(403, 'Forbidden')
    if (!access.card) return jsonError(404, 'Not found')

    const input = parsed.data

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
      return jsonError(500, 'Failed to update card')
    }

    return NextResponse.json({ card })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] PATCH card unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const ctx = await requireAuth()
    const cardId = (await params).cardId

    const admin = createServiceRoleClient()

    const access = await requireWriteAccessForCard(admin, ctx, cardId)
    if ((access as { forbidden?: true }).forbidden) return jsonError(403, 'Forbidden')
    if (!access.card) return NextResponse.json({ ok: true, missing: true })

    const { error } = await admin.from('conversation_cards').delete().eq('id', cardId)
    if (error) {
      console.error('[admin/conversation-cards] delete card error', error)
      return jsonError(500, 'Failed to delete card')
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] DELETE card unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}
