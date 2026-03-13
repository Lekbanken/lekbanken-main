import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const listSchema = z.object({
  tenantId: z.string().uuid(),
})

const createSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(120),
  eventType: z.string().min(3).max(200),
  bonusAmount: z.number().int().positive().max(1_000_000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  budgetAmount: z.number().int().nonnegative().max(1_000_000_000).optional().nullable(),
  isActive: z.boolean().optional(),
})

const createFromTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  templateId: z.string().uuid(),
  startsAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
})

const createAnySchema = z.union([createSchema, createFromTemplateSchema])

const toggleSchema = z.object({
  tenantId: z.string().uuid(),
  campaignId: z.string().uuid(),
  isActive: z.boolean(),
})

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const parsed = listSchema.safeParse({ tenantId: url.searchParams.get('tenantId') })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
    }

    const { tenantId } = parsed.data
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from('gamification_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: 'Failed to load campaigns', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data ?? [] }, { status: 200 })
  },
})

export const POST = apiHandler({
  auth: 'user',
  input: createAnySchema,
  handler: async ({ auth, body }) => {
    const tenantId = body.tenantId
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    if ('templateId' in body) {
      const startsAt = body.startsAt ?? new Date().toISOString()

      const { data: rpcData, error: rpcError } = await admin.rpc('create_gamification_campaign_from_template_v1', {
        p_tenant_id: tenantId,
        p_template_id: body.templateId,
        p_starts_at: startsAt,
        p_actor_user_id: auth!.user!.id,
        p_idempotency_key: body.idempotencyKey ?? undefined,
      })

      if (rpcError) {
        return NextResponse.json({ error: 'Failed to create campaign', details: rpcError.message }, { status: 500 })
      }

      const campaignId = Array.isArray(rpcData)
        ? (rpcData[0]?.campaign_id as string | undefined)
        : ((rpcData as unknown as { campaign_id?: string } | null)?.campaign_id ?? undefined)

      if (!campaignId) {
        return NextResponse.json({ error: 'Failed to create campaign', details: 'Missing campaign id' }, { status: 500 })
      }

      const { data: campaign, error: loadError } = await admin
        .from('gamification_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', campaignId)
        .maybeSingle()

      if (loadError) {
        return NextResponse.json({ error: 'Failed to load created campaign', details: loadError.message }, { status: 500 })
      }

      try {
        await admin.from('tenant_audit_logs').insert({
          tenant_id: tenantId,
          actor_user_id: auth!.user!.id,
          event_type: 'gamification.campaign.created_from_template.v1',
          payload: ({ campaignId, templateId: body.templateId, startsAt } as unknown) as Json,
          created_at: new Date().toISOString(),
        })
      } catch {
        // best-effort
      }

      return NextResponse.json({ campaign }, { status: 200 })
    }

    const { name, eventType, bonusAmount, startsAt, endsAt, budgetAmount, isActive } = body

    const insertPayload = {
      tenant_id: tenantId,
      name,
      event_type: eventType,
      bonus_amount: bonusAmount,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive ?? true,
      budget_amount: budgetAmount ?? null,
      created_by_user_id: auth!.user!.id,
    }

    const { data, error } = await admin.from('gamification_campaigns').insert(insertPayload).select('*').maybeSingle()
    if (error) {
      return NextResponse.json({ error: 'Failed to create campaign', details: error.message }, { status: 500 })
    }

    try {
      await admin.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: auth!.user!.id,
        event_type: 'gamification.campaign.created.v1',
        payload: ({ campaignId: data?.id, ...insertPayload } as unknown) as Json,
        created_at: new Date().toISOString(),
      })
    } catch {
      // best-effort
    }

    return NextResponse.json({ campaign: data }, { status: 200 })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  input: toggleSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, campaignId, isActive } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    const { data, error } = await admin
      .from('gamification_campaigns')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', campaignId)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update campaign', details: error.message }, { status: 500 })
    }

    try {
      await admin.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: auth!.user!.id,
        event_type: 'gamification.campaign.updated.v1',
        payload: ({ campaignId, isActive } as unknown) as Json,
        created_at: new Date().toISOString(),
      })
    } catch {
      // best-effort
    }

    return NextResponse.json({ campaign: data }, { status: 200 })
  },
})
