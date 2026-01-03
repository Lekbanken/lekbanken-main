import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireAuth, AuthError, requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const createCardSchema = z.object({
  sort_order: z.number().int().optional(),
  card_title: z.string().nullable().optional(),
  primary_prompt: z.string().min(1),
  followup_1: z.string().nullable().optional(),
  followup_2: z.string().nullable().optional(),
  followup_3: z.string().nullable().optional(),
  leader_tip: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
})

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const ctx = await requireAuth()
    const collectionId = (await params).collectionId
    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

    const body = await req.json().catch(() => ({}))
    const parsed = createCardSchema.safeParse(body)
    if (!parsed.success) return jsonError(400, 'Invalid payload', parsed.error.flatten())

    const admin = createServiceRoleClient()

    const { data: collection, error: colError } = await admin
      .from('conversation_card_collections')
      .select('id,scope_type,tenant_id')
      .eq('id', collectionId)
      .maybeSingle()

    if (colError) {
      console.error('[admin/conversation-cards] create card collection load error', colError)
      return jsonError(500, 'Failed to load collection')
    }

    if (!collection) return jsonError(404, 'Not found')

    if (collection.scope_type === 'global') {
      if (!isSystemAdmin) return jsonError(403, 'Forbidden')
    } else {
      if (!collection.tenant_id) return jsonError(500, 'Invalid collection scope')
      await requireTenantRole(['owner', 'admin'], collection.tenant_id)
    }

    const input = parsed.data

    const { data: card, error } = await admin
      .from('conversation_cards')
      .insert({
        collection_id: collectionId,
        sort_order: input.sort_order ?? 0,
        card_title: input.card_title?.trim() ?? null,
        primary_prompt: input.primary_prompt.trim(),
        followup_1: input.followup_1?.trim() ?? null,
        followup_2: input.followup_2?.trim() ?? null,
        followup_3: input.followup_3?.trim() ?? null,
        leader_tip: input.leader_tip?.trim() ?? null,
        metadata: (input.metadata ?? {}) as unknown as Json,
      })
      .select('id,collection_id,sort_order,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip,metadata,created_at,updated_at')
      .single()

    if (error || !card) {
      console.error('[admin/conversation-cards] create card error', error)
      return jsonError(500, 'Failed to create card')
    }

    return NextResponse.json({ card }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] POST card unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}
