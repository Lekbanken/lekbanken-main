import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const updateCollectionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  main_purpose_id: z.string().uuid().nullable().optional(),
  secondary_purpose_ids: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

async function loadCollection(
  admin: ReturnType<typeof createServiceRoleClient>,
  collectionId: string
) {
  const { data, error } = await admin
    .from('conversation_card_collections')
    .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_by_user_id,created_at,updated_at')
    .eq('id', collectionId)
    .maybeSingle()

  if (error) throw error
  return data
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const collectionId = params.collectionId

    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const collection = await loadCollection(admin, collectionId)
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!isSystemAdmin) {
      if (collection.scope_type === 'global') {
        if (collection.status !== 'published') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      } else {
        const isMember = auth!.memberships.some((m) => m.tenant_id === collection.tenant_id && m.status === 'active')
        if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const [{ data: cards, error: cardsError }, { data: secondary, error: secondaryError }] = await Promise.all([
      admin
        .from('conversation_cards')
        .select('id,collection_id,sort_order,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip,metadata,created_at,updated_at')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      admin
        .from('conversation_card_collection_secondary_purposes')
        .select('purpose_id')
        .eq('collection_id', collectionId)
        .limit(500),
    ])

    if (cardsError) {
      console.error('[admin/conversation-cards] cards load error', cardsError)
      return NextResponse.json({ error: 'Failed to load cards' }, { status: 500 })
    }

    if (secondaryError) {
      console.error('[admin/conversation-cards] secondary purposes load error', secondaryError)
      return NextResponse.json({ error: 'Failed to load secondary purposes' }, { status: 500 })
    }

    return NextResponse.json({
      collection,
      cards: cards ?? [],
      secondary_purpose_ids: (secondary ?? []).map((r) => r.purpose_id),
    })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  input: updateCollectionSchema,
  handler: async ({ auth, body: input, params }) => {
    const collectionId = params.collectionId

    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const existing = await loadCollection(admin, collectionId)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.scope_type === 'global') {
      if (!isSystemAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      if (!existing.tenant_id) return NextResponse.json({ error: 'Invalid collection scope' }, { status: 500 })
      await requireTenantRole(['owner', 'admin'], existing.tenant_id)
    }

    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.description !== undefined) updates.description = input.description?.trim() ?? null
    if (input.audience !== undefined) updates.audience = input.audience?.trim() ?? null
    if (input.language !== undefined) updates.language = input.language?.trim() ?? null
    if (input.main_purpose_id !== undefined) updates.main_purpose_id = input.main_purpose_id
    if (input.status !== undefined) updates.status = input.status

    const { data: collection, error: updateError } = await admin
      .from('conversation_card_collections')
      .update(updates)
      .eq('id', collectionId)
      .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_at,updated_at')
      .single()

    if (updateError || !collection) {
      console.error('[admin/conversation-cards] update collection error', updateError)
      return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
    }

    if (input.secondary_purpose_ids) {
      const desired = Array.from(new Set(input.secondary_purpose_ids))
      const [{ error: delError }, { error: insError }] = await Promise.all([
        admin.from('conversation_card_collection_secondary_purposes').delete().eq('collection_id', collectionId),
        desired.length
          ? admin
              .from('conversation_card_collection_secondary_purposes')
              .insert(desired.map((purpose_id) => ({ collection_id: collectionId, purpose_id })))
          : Promise.resolve({ error: null } as { error: null }),
      ])

      if (delError) console.error('[admin/conversation-cards] replace secondary purposes delete error', delError)
      if (insError) console.error('[admin/conversation-cards] replace secondary purposes insert error', insError)
    }

    return NextResponse.json({ collection })
  },
})

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const collectionId = params.collectionId

    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const existing = await loadCollection(admin, collectionId)
    if (!existing) return NextResponse.json({ ok: true, missing: true })

    if (existing.scope_type === 'global') {
      if (!isSystemAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      if (!existing.tenant_id) return NextResponse.json({ error: 'Invalid collection scope' }, { status: 500 })
      await requireTenantRole(['owner', 'admin'], existing.tenant_id)
    }

    const { error } = await admin.from('conversation_card_collections').delete().eq('id', collectionId)
    if (error) {
      console.error('[admin/conversation-cards] delete collection error', error)
      return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  },
})
