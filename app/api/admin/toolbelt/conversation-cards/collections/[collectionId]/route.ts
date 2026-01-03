import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireAuth, AuthError, requireTenantRole } from '@/lib/api/auth-guard'
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

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const ctx = await requireAuth()
    const collectionId = (await params).collectionId

    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const collection = await loadCollection(admin, collectionId)
    if (!collection) return jsonError(404, 'Not found')

    if (!isSystemAdmin) {
      if (collection.scope_type === 'global') {
        if (collection.status !== 'published') return jsonError(403, 'Forbidden')
      } else {
        const isMember = ctx.memberships.some((m) => m.tenant_id === collection.tenant_id && m.status === 'active')
        if (!isMember) return jsonError(403, 'Forbidden')
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
      return jsonError(500, 'Failed to load cards')
    }

    if (secondaryError) {
      console.error('[admin/conversation-cards] secondary purposes load error', secondaryError)
      return jsonError(500, 'Failed to load secondary purposes')
    }

    return NextResponse.json({
      collection,
      cards: cards ?? [],
      secondary_purpose_ids: (secondary ?? []).map((r) => r.purpose_id),
    })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] GET unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const ctx = await requireAuth()
    const collectionId = (await params).collectionId

    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const existing = await loadCollection(admin, collectionId)
    if (!existing) return jsonError(404, 'Not found')

    if (existing.scope_type === 'global') {
      if (!isSystemAdmin) return jsonError(403, 'Forbidden')
    } else {
      if (!existing.tenant_id) return jsonError(500, 'Invalid collection scope')
      await requireTenantRole(['owner', 'admin'], existing.tenant_id)
    }

    const body = await req.json().catch(() => ({}))
    const parsed = updateCollectionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(400, 'Invalid payload', parsed.error.flatten())
    }

    const input = parsed.data

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
      return jsonError(500, 'Failed to update collection')
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
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] PATCH unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    const ctx = await requireAuth()
    const collectionId = (await params).collectionId

    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'
    const admin = createServiceRoleClient()

    const existing = await loadCollection(admin, collectionId)
    if (!existing) return NextResponse.json({ ok: true, missing: true })

    if (existing.scope_type === 'global') {
      if (!isSystemAdmin) return jsonError(403, 'Forbidden')
    } else {
      if (!existing.tenant_id) return jsonError(500, 'Invalid collection scope')
      await requireTenantRole(['owner', 'admin'], existing.tenant_id)
    }

    const { error } = await admin.from('conversation_card_collections').delete().eq('id', collectionId)
    if (error) {
      console.error('[admin/conversation-cards] delete collection error', error)
      return jsonError(500, 'Failed to delete collection')
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] DELETE unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}
