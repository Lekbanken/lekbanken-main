import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

export type GamificationRewardSource = 'planner' | 'play' | 'admin' | 'system'

export type ApplyGamificationRewardsForEventV1Input = {
  eventId: string
  eventCreatedAt?: string | null
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationRewardSource
  metadata?: Record<string, unknown> | null
}

export type ApplyGamificationRewardsForEventV1Result = {
  applied: boolean
  coinTransactionId: string | null
  bonusCoinTransactionId?: string | null
  balance: number | null
  ruleId: string | null
}

async function getActiveCoinMultiplier(
  admin: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  userId: string,
  at: string
): Promise<{ multiplier: number; effectId: string | null } | null> {
  const { data, error } = await admin.rpc('get_active_coin_multiplier_v1', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_at: at,
  })

  if (error) return null
  const row = data?.[0]
  if (!row) return null

  const m = Number(row.multiplier)
  if (!Number.isFinite(m) || m <= 1) return null
  const effectId = typeof row.effect_id === 'string' ? row.effect_id : null
  return { multiplier: m, effectId }
}

const REWARD_RULES_V1: Array<{
  id: string
  source: GamificationRewardSource
  eventType: string
  coins: number
  reasonCode: string
  description: string
}> = [
  {
    id: 'play.run_completed.v1',
    source: 'play',
    eventType: 'run_completed',
    coins: 1,
    reasonCode: 'event:run_completed',
    description: 'Reward for run completed',
  },
  {
    id: 'play.session_completed.v1',
    source: 'play',
    eventType: 'session_completed',
    coins: 2,
    reasonCode: 'event:session_completed',
    description: 'Reward for session completed',
  },
  {
    id: 'planner.plan_created.v1',
    source: 'planner',
    eventType: 'plan_created',
    coins: 5,
    reasonCode: 'event:plan_created',
    description: 'Reward for plan created',
  },
  {
    id: 'planner.plan_published.v1',
    source: 'planner',
    eventType: 'plan_published',
    coins: 10,
    reasonCode: 'event:plan_published',
    description: 'Reward for plan published',
  },
]

export async function applyGamificationRewardsForEventV1(
  input: ApplyGamificationRewardsForEventV1Input
): Promise<ApplyGamificationRewardsForEventV1Result> {
  if (!input.tenantId) {
    return { applied: false, coinTransactionId: null, bonusCoinTransactionId: null, balance: null, ruleId: null }
  }

  const rule = REWARD_RULES_V1.find((r) => r.source === input.source && r.eventType === input.eventType)
  if (!rule) {
    return { applied: false, coinTransactionId: null, bonusCoinTransactionId: null, balance: null, ruleId: null }
  }

  const admin = createServiceRoleClient()

  const eventAt = input.eventCreatedAt ?? new Date().toISOString()
  const boost = await getActiveCoinMultiplier(admin, input.tenantId, input.actorUserId, eventAt)
  const multiplier = boost?.multiplier ?? 1
  const bonusCoins = multiplier > 1 ? Math.max(0, Math.round(rule.coins * (multiplier - 1))) : 0

  const idempotencyKey = `evt:${input.eventId}:coins`

  const { data, error } = await admin.rpc('apply_coin_transaction_v1', {
    p_user_id: input.actorUserId,
    p_tenant_id: input.tenantId,
    p_type: 'earn',
    p_amount: rule.coins,
    p_reason_code: rule.reasonCode,
    p_idempotency_key: idempotencyKey,
    p_description: rule.description,
    p_source: input.source,
    p_metadata: ({
      eventId: input.eventId,
      eventCreatedAt: input.eventCreatedAt ?? null,
      eventType: input.eventType,
      ruleId: rule.id,
      ...(bonusCoins > 0 ? { coinMultiplier: multiplier, powerupEffectId: boost?.effectId ?? null } : null),
      ...(input.metadata ? { metadata: input.metadata } : null),
    } as unknown as Json),
  })

  if (error) {
    throw new Error(typeof error?.message === 'string' ? error.message : 'Reward transaction failed')
  }

  const row = data?.[0] ?? null

  let bonusCoinTransactionId: string | null = null
  let finalBalance: number | null = typeof row?.balance === 'number' ? row.balance : null
  if (bonusCoins > 0) {
    const bonusIdempotencyKey = `evt:${input.eventId}:coins:bonus`
    const { data: bonusData, error: bonusError } = await admin.rpc('apply_coin_transaction_v1', {
      p_user_id: input.actorUserId,
      p_tenant_id: input.tenantId,
      p_type: 'earn',
      p_amount: bonusCoins,
      p_reason_code: 'powerup:coin_multiplier',
      p_idempotency_key: bonusIdempotencyKey,
      p_description: `Powerup bonus (${multiplier}x)`,
      p_source: 'system',
      p_metadata: ({
        eventId: input.eventId,
        eventCreatedAt: input.eventCreatedAt ?? null,
        eventType: input.eventType,
        ruleId: rule.id,
        baseCoins: rule.coins,
        bonusCoins,
        coinMultiplier: multiplier,
        powerupEffectId: boost?.effectId ?? null,
      } as unknown as Json),
    })

    if (!bonusError) {
      const bonusRow = bonusData?.[0] ?? null
      bonusCoinTransactionId = typeof bonusRow?.transaction_id === 'string' ? bonusRow.transaction_id : null
      finalBalance = typeof bonusRow?.balance === 'number' ? bonusRow.balance : finalBalance
    }
  }

  return {
    applied: true,
    coinTransactionId: typeof row?.transaction_id === 'string' ? row.transaction_id : null,
    bonusCoinTransactionId,
    balance: finalBalance,
    ruleId: rule.id,
  }
}
