import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
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

export const POST = apiHandler({
  auth: 'user',
  input: createCardSchema,
  handler: async ({ auth, body: input, params }) => {
    const collectionId = params.collectionId
    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'

    const admin = createServiceRoleClient()

    const { data: collection, error: colError } = await admin
      .from('conversation_card_collections')
      .select('id,scope_type,tenant_id')
      .eq('id', collectionId)
      .maybeSingle()

    if (colError) {
      console.error('[admin/conversation-cards] create card collection load error', colError)
      return NextResponse.json({ error: 'Failed to load collection' }, { status: 500 })
    }

    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (collection.scope_type === 'global') {
      if (!isSystemAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      if (!collection.tenant_id) return NextResponse.json({ error: 'Invalid collection scope' }, { status: 500 })
      await requireTenantRole(['owner', 'admin'], collection.tenant_id)
    }

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
      return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
    }

    return NextResponse.json({ card }, { status: 201 })
  },
})
