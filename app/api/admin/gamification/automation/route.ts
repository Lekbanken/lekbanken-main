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
  rewardAmount: z.number().int().positive().max(1_000_000),
  isActive: z.boolean().optional(),
})

const toggleSchema = z.object({
  tenantId: z.string().uuid(),
  ruleId: z.string().uuid(),
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
      .from('gamification_automation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: 'Failed to load rules', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ rules: data ?? [] }, { status: 200 })
  },
})

export const POST = apiHandler({
  auth: 'user',
  input: createSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, name, eventType, rewardAmount, isActive } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    const insertPayload = {
      tenant_id: tenantId,
      name,
      event_type: eventType,
      reward_amount: rewardAmount,
      is_active: isActive ?? true,
      created_by_user_id: auth!.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin.from('gamification_automation_rules').insert(insertPayload).select('*').maybeSingle()
    if (error) {
      return NextResponse.json({ error: 'Failed to create rule', details: error.message }, { status: 500 })
    }

    try {
      await admin.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: auth!.user!.id,
        event_type: 'gamification.automation_rule.created.v1',
        payload: ({ ruleId: data?.id, ...insertPayload } as unknown) as Json,
        created_at: new Date().toISOString(),
      })
    } catch {
      // best-effort
    }

    return NextResponse.json({ rule: data }, { status: 200 })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  input: toggleSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, ruleId, isActive } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()

    const { data, error } = await admin
      .from('gamification_automation_rules')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', ruleId)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update rule', details: error.message }, { status: 500 })
    }

    try {
      await admin.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: auth!.user!.id,
        event_type: 'gamification.automation_rule.updated.v1',
        payload: ({ ruleId, isActive } as unknown) as Json,
        created_at: new Date().toISOString(),
      })
    } catch {
      // best-effort
    }

    return NextResponse.json({ rule: data }, { status: 200 })
  },
})
