import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { requireAuth, AuthError, requireTenantRole } from '@/lib/api/auth-guard'
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

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    const url = new URL(req.url)

    const parsed = scopeQuerySchema.safeParse({
      scopeType: url.searchParams.get('scopeType') ?? 'tenant',
      tenantId: url.searchParams.get('tenantId'),
      status: url.searchParams.get('status') ?? 'all',
      mainPurposeId: url.searchParams.get('mainPurposeId'),
      subPurposeId: url.searchParams.get('subPurposeId'),
    })

    if (!parsed.success) {
      return jsonError(400, 'Invalid query', parsed.error.flatten())
    }

    const { scopeType, tenantId: tenantIdParam, status, mainPurposeId, subPurposeId } = parsed.data

    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

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
          return jsonError(500, 'Failed to load collections')
        }

        const ids = (links ?? []).map((l) => l.collection_id)
        if (ids.length === 0) return NextResponse.json({ collections: [] })
        query = query.in('id', ids)
      }

      const { data, error } = await query
      if (error) {
        console.error('[admin/conversation-cards] list global error', error)
        return jsonError(500, 'Failed to load collections')
      }

      return NextResponse.json({ collections: data ?? [] })
    }

    // tenant scope
    const resolvedTenantId = tenantIdParam ?? ctx.activeTenant?.id ?? ctx.memberships[0]?.tenant_id ?? null
    if (!resolvedTenantId) {
      return jsonError(400, 'tenantId required for tenant scope')
    }

    // Read access: any tenant member can list; writes are enforced elsewhere.
    const isMember = ctx.memberships.some((m) => m.tenant_id === resolvedTenantId && m.status === 'active')
    if (!isSystemAdmin && !isMember) {
      return jsonError(403, 'Forbidden')
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
        return jsonError(500, 'Failed to load collections')
      }

      const ids = (links ?? []).map((l) => l.collection_id)
      if (ids.length === 0) return NextResponse.json({ collections: [] })
      query = query.in('id', ids)
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/conversation-cards] list tenant error', error)
      return jsonError(500, 'Failed to load collections')
    }

    return NextResponse.json({ collections: data ?? [] })
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] GET unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    if (!ctx.user) return jsonError(401, 'Unauthorized')
    const isSystemAdmin = ctx.effectiveGlobalRole === 'system_admin'

    const body = await req.json().catch(() => ({}))
    const parsed = createCollectionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(400, 'Invalid payload', parsed.error.flatten())
    }

    const input = parsed.data

    if (input.scope_type === 'global') {
      if (!isSystemAdmin) return jsonError(403, 'Forbidden')
    } else {
      const tenantId = input.tenant_id ?? ctx.activeTenant?.id ?? null
      if (!tenantId) return jsonError(400, 'tenant_id required for tenant scope')

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
        created_by_user_id: ctx.user.id,
      })
      .select('id,scope_type,tenant_id,title,description,audience,language,main_purpose_id,status,created_at,updated_at')
      .single()

    if (insertError || !collection) {
      console.error('[admin/conversation-cards] create collection error', insertError)
      return jsonError(500, 'Failed to create collection')
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
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.status, e.message)
    console.error('[admin/conversation-cards] POST unexpected error', e)
    return jsonError(500, 'Unexpected error')
  }
}
