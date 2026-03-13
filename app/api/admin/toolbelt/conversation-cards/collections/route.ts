import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const scopeQuerySchema = z.object({
  scopeType: z.enum(['global', 'tenant']).default('tenant'),
  tenantId: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'published', 'all']).default('all'),
  mainPurposeId: z.string().uuid().nullable().optional(),
  subPurposeId: z.string().uuid().nullable().optional(),
})

const createCollectionSchema = z.object({
  scope_type: z.enum(['global', 'tenant']),
  tenant_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  main_purpose_id: z.string().uuid().nullable().optional(),
  secondary_purpose_ids: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const url = new URL(req.url)

    const parsed = scopeQuerySchema.safeParse({
      scopeType: url.searchParams.get('scopeType') ?? 'tenant',
      tenantId: url.searchParams.get('tenantId'),
      status: url.searchParams.get('status') ?? 'all',
      mainPurposeId: url.searchParams.get('mainPurposeId'),
      subPurposeId: url.searchParams.get('subPurposeId'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
    }

    const { scopeType, tenantId: tenantIdParam, status, mainPurposeId, subPurposeId } = parsed.data

    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'

    const admin = createServiceRoleClient()

    if (scopeType === 'global') {
      let query = admin
        .from('conversation_card_collections')
        .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_at,updated_at, conversation_cards(count)')
        .eq('scope_type', 'global')
        .is('tenant_id', null)
        .order('updated_at', { ascending: false })
        .limit(200)

      if (!isSystemAdmin) {
        query = query.eq('status', 'published')
      } else if (status !== 'all') {
        query = query.eq('status', status)
      }

      if (mainPurposeId) query = query.eq('main_purpose_id', mainPurposeId)

      if (subPurposeId) {
        const { data: links, error: linkError } = await admin
          .from('conversation_card_collection_secondary_purposes')
          .select('collection_id')
          .eq('purpose_id', subPurposeId)
          .limit(500)

        if (linkError) {
          console.error('[admin/conversation-cards] secondary purposes query error', linkError)
          return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
        }

        const ids = (links ?? []).map((l) => l.collection_id)
        if (ids.length === 0) return NextResponse.json({ collections: [] })
        query = query.in('id', ids)
      }

      const { data, error } = await query
      if (error) {
        console.error('[admin/conversation-cards] list global error', error)
        return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
      }

      return NextResponse.json({ collections: data ?? [] })
    }

    // tenant scope
    const resolvedTenantId = tenantIdParam ?? auth!.activeTenant?.id ?? auth!.memberships[0]?.tenant_id ?? null
    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'tenantId required for tenant scope' }, { status: 400 })
    }

    // Read access: any tenant member can list; writes are enforced elsewhere.
    const isMember = auth!.memberships.some((m) => m.tenant_id === resolvedTenantId && m.status === 'active')
    if (!isSystemAdmin && !isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = admin
      .from('conversation_card_collections')
      .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_at,updated_at, conversation_cards(count)')
      .eq('scope_type', 'tenant')
      .eq('tenant_id', resolvedTenantId)
      .order('updated_at', { ascending: false })
      .limit(200)

    if (status !== 'all') query = query.eq('status', status)
    if (mainPurposeId) query = query.eq('main_purpose_id', mainPurposeId)

    if (subPurposeId) {
      const { data: links, error: linkError } = await admin
        .from('conversation_card_collection_secondary_purposes')
        .select('collection_id')
        .eq('purpose_id', subPurposeId)
        .limit(500)

      if (linkError) {
        console.error('[admin/conversation-cards] secondary purposes query error', linkError)
        return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
      }

      const ids = (links ?? []).map((l) => l.collection_id)
      if (ids.length === 0) return NextResponse.json({ collections: [] })
      query = query.in('id', ids)
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/conversation-cards] list tenant error', error)
      return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
    }

    return NextResponse.json({ collections: data ?? [] })
  },
})

export const POST = apiHandler({
  auth: 'user',
  input: createCollectionSchema,
  handler: async ({ auth, body: input }) => {
    const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin'

    if (input.scope_type === 'global') {
      if (!isSystemAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      const tenantId = input.tenant_id ?? auth!.activeTenant?.id ?? null
      if (!tenantId) return NextResponse.json({ error: 'tenant_id required for tenant scope' }, { status: 400 })

      // Require tenant admin (owner/admin)
      await requireTenantRole(['owner', 'admin'], tenantId)
      input.tenant_id = tenantId
    }

    const admin = createServiceRoleClient()

    const { data: collection, error: insertError } = await admin
      .from('conversation_card_collections')
      .insert({
        scope_type: input.scope_type,
        tenant_id: input.scope_type === 'global' ? null : (input.tenant_id ?? null),
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        audience: input.audience?.trim() ?? null,
        language: input.language?.trim() ?? null,
        main_purpose_id: input.main_purpose_id ?? null,
        status: input.status ?? 'draft',
        created_by_user_id: auth!.user!.id,
      })
      .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_at,updated_at')
      .single()

    if (insertError || !collection) {
      console.error('[admin/conversation-cards] create collection error', insertError)
      return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
    }

    const ids = input.secondary_purpose_ids ?? []
    if (ids.length > 0) {
      const { error: linkError } = await admin
        .from('conversation_card_collection_secondary_purposes')
        .insert(ids.map((purpose_id) => ({ collection_id: collection.id, purpose_id })))

      if (linkError) {
        console.error('[admin/conversation-cards] create secondary purpose links error', linkError)
        // Do not fail hard; return created collection.
      }
    }

    return NextResponse.json({ collection }, { status: 201 })
  },
})
