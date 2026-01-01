import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'
import { applyGamificationRewardsForEventV1 } from '@/lib/services/gamification-rewards.server'
import { applyGamificationAchievementsForEventV1 } from '@/lib/services/gamification-achievements.server'

export type GamificationEventSource = 'planner' | 'play' | 'admin' | 'system'

export type LogGamificationEventV1Input = {
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationEventSource
  idempotencyKey: string
  metadata?: Record<string, unknown> | null
}

async function applyCampaignBonusesForEventV1(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  eventId: string
  eventType: string
}) {
  if (!args.tenantId) return

  const nowIso = new Date().toISOString()
  const { data: campaigns, error } = await args.admin
    .from('gamification_campaigns')
    .select('id,event_type,bonus_amount')
    .eq('tenant_id', args.tenantId)
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .gte('ends_at', nowIso)
    .eq('event_type', args.eventType)

  if (error || !Array.isArray(campaigns) || campaigns.length === 0) return

  for (const campaign of campaigns) {
    const campaignId = campaign.id
    if (!campaignId) continue

    await args.admin.rpc('apply_campaign_bonus_v1', {
      p_campaign_id: campaignId,
      p_user_id: args.actorUserId,
      p_tenant_id: args.tenantId,
      p_event_id: args.eventId,
      p_event_type: args.eventType,
      p_idempotency_key: `evt:${args.eventId}:campaign:${campaignId}:coins`,
    })
  }
}

async function applyAutomationRulesForEventV1(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  eventId: string
  eventType: string
}) {
  if (!args.tenantId) return

  const { data: rules, error } = await args.admin
    .from('gamification_automation_rules')
    .select('id,event_type,reward_amount')
    .eq('tenant_id', args.tenantId)
    .eq('is_active', true)
    .eq('event_type', args.eventType)

  if (error || !Array.isArray(rules) || rules.length === 0) return

  for (const rule of rules) {
    const ruleId = rule.id
    if (!ruleId) continue

    await args.admin.rpc('apply_automation_rule_reward_v1', {
      p_rule_id: ruleId,
      p_user_id: args.actorUserId,
      p_tenant_id: args.tenantId,
      p_event_id: args.eventId,
      p_event_type: args.eventType,
      p_idempotency_key: `evt:${args.eventId}:rule:${ruleId}:coins`,
    })
  }
}

export async function logGamificationEventV1(input: LogGamificationEventV1Input): Promise<{ eventId: string | null; idempotent: boolean }> {
  const admin = createServiceRoleClient()

  const payload = {
    tenant_id: input.tenantId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    source: input.source,
    idempotency_key: input.idempotencyKey,
    metadata: (input.metadata ?? null) as unknown as Json | null,
  }

  const { data: inserted, error: insertError } = await admin
    .from('gamification_events')
    .insert(payload)
    .select('id,created_at')
    .maybeSingle()

  if (!insertError) {
    if (inserted?.id) {
      try {
        await applyGamificationRewardsForEventV1({
          eventId: inserted.id,
          eventCreatedAt: inserted.created_at,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          eventType: input.eventType,
          source: input.source,
          metadata: input.metadata ?? null,
        })
      } catch (e) {
        console.warn('[gamification] reward evaluation failed', e)
      }

      try {
        await applyGamificationAchievementsForEventV1({
          eventId: inserted.id,
          eventCreatedAt: inserted.created_at,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          eventType: input.eventType,
          source: input.source,
          metadata: input.metadata ?? null,
        })
      } catch (e) {
        console.warn('[gamification] achievement evaluation failed', e)
      }

      try {
        await applyCampaignBonusesForEventV1({
          admin,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          eventId: inserted.id,
          eventType: input.eventType,
        })
      } catch (e) {
        console.warn('[gamification] campaign bonus evaluation failed', e)
      }

      try {
        await applyAutomationRulesForEventV1({
          admin,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          eventId: inserted.id,
          eventType: input.eventType,
        })
      } catch (e) {
        console.warn('[gamification] automation rule evaluation failed', e)
      }
    }
    return { eventId: inserted?.id ?? null, idempotent: false }
  }

  const code = String(insertError.code ?? '')
  if (code !== '23505') {
    throw insertError
  }

  const query = admin
    .from('gamification_events')
    .select('id,created_at')
    .eq('source', input.source)
    .eq('idempotency_key', input.idempotencyKey)

  if (input.tenantId) {
    query.eq('tenant_id', input.tenantId)
  } else {
    query.is('tenant_id', null)
  }

  const { data: existing, error: fetchError } = await query.maybeSingle()
  if (fetchError) {
    throw fetchError
  }

  if (existing?.id) {
    try {
      await applyGamificationRewardsForEventV1({
        eventId: existing.id,
        eventCreatedAt: (existing as { created_at?: string | null }).created_at ?? null,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        source: input.source,
        metadata: input.metadata ?? null,
      })
    } catch (e) {
      console.warn('[gamification] reward evaluation failed', e)
    }

    try {
      await applyGamificationAchievementsForEventV1({
        eventId: existing.id,
        eventCreatedAt: (existing as { created_at?: string | null }).created_at ?? null,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        source: input.source,
        metadata: input.metadata ?? null,
      })
    } catch (e) {
      console.warn('[gamification] achievement evaluation failed', e)
    }

    try {
      await applyCampaignBonusesForEventV1({
        admin,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        eventId: existing.id,
        eventType: input.eventType,
      })
    } catch (e) {
      console.warn('[gamification] campaign bonus evaluation failed', e)
    }

    try {
      await applyAutomationRulesForEventV1({
        admin,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        eventId: existing.id,
        eventType: input.eventType,
      })
    } catch (e) {
      console.warn('[gamification] automation rule evaluation failed', e)
    }
  }

  return { eventId: existing?.id ?? null, idempotent: true }
}
