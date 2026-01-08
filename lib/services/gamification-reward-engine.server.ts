import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

// ============================================================================
// TYPES
// ============================================================================

export type GamificationSource =
  | 'planner'
  | 'play'
  | 'admin'
  | 'content'
  | 'social'
  | 'learning'
  | 'system'
  | 'engagement'

export type CooldownType = 'none' | 'daily' | 'weekly' | 'once' | 'once_per_streak'

export interface RewardRule {
  id: string
  tenantId: string | null // null = global
  eventType: string
  source: GamificationSource
  coins: number
  xp: number
  cooldownType: CooldownType
  baseMultiplier: number
  conditions: RewardCondition[]
  isActive: boolean
}

export interface RewardCondition {
  type: 'count' | 'threshold' | 'time' | 'metadata' | 'streak'
  field?: string
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in'
  value: unknown
}

export interface MultiplierSource {
  source: 'streak' | 'campaign' | 'powerup' | 'level' | 'weekend' | 'first_time'
  multiplier: number
  effectId?: string | null
  description: string
}

export interface EvaluateRewardInput {
  eventId: string
  eventCreatedAt: string
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationSource
  metadata?: Record<string, unknown> | null
}

export interface EvaluateRewardResult {
  applied: boolean
  skipped: boolean
  skipReason?: string
  coinTransactionId: string | null
  xpTransactionId: string | null
  balance: number | null
  xp: number | null
  ruleId: string | null
  // Detailed breakdown
  baseCoins: number
  baseXp: number
  adjustedCoins: number
  adjustedXp: number
  effectiveMultiplier: number
  softcapApplied: boolean
  cooldownBlocked: boolean
  multiplierSources: MultiplierSource[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_MULTIPLIER_CAP = 2.0

// Hardcoded rules for MVP (will be replaced by DB rules)
const GLOBAL_REWARD_RULES: RewardRule[] = [
  // Play domain
  {
    id: 'play.session_started.v1',
    tenantId: null,
    eventType: 'session_started',
    source: 'play',
    coins: 1,
    xp: 10,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'play.session_completed.v1',
    tenantId: null,
    eventType: 'session_completed',
    source: 'play',
    coins: 2,
    xp: 25,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'play.run_completed.v1',
    tenantId: null,
    eventType: 'run_completed',
    source: 'play',
    coins: 1,
    xp: 15,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'play.first_session.v1',
    tenantId: null,
    eventType: 'first_session',
    source: 'play',
    coins: 50,
    xp: 500,
    cooldownType: 'once',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'play.perfect_session.v1',
    tenantId: null,
    eventType: 'perfect_session',
    source: 'play',
    coins: 5,
    xp: 50,
    cooldownType: 'daily',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'play.large_group_hosted.v1',
    tenantId: null,
    eventType: 'large_group_hosted',
    source: 'play',
    coins: 10,
    xp: 100,
    cooldownType: 'weekly',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  // Planner domain
  {
    id: 'planner.plan_created.v1',
    tenantId: null,
    eventType: 'plan_created',
    source: 'planner',
    coins: 5,
    xp: 20,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'planner.plan_published.v1',
    tenantId: null,
    eventType: 'plan_published',
    source: 'planner',
    coins: 10,
    xp: 50,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'planner.first_plan.v1',
    tenantId: null,
    eventType: 'first_plan',
    source: 'planner',
    coins: 25,
    xp: 200,
    cooldownType: 'once',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  // Engagement domain
  {
    id: 'engagement.daily_login.v1',
    tenantId: null,
    eventType: 'daily_login',
    source: 'engagement',
    coins: 1,
    xp: 10,
    cooldownType: 'daily',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'engagement.streak_3_days.v1',
    tenantId: null,
    eventType: 'streak_3_days',
    source: 'engagement',
    coins: 5,
    xp: 30,
    cooldownType: 'once_per_streak',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'engagement.streak_7_days.v1',
    tenantId: null,
    eventType: 'streak_7_days',
    source: 'engagement',
    coins: 15,
    xp: 75,
    cooldownType: 'once_per_streak',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'engagement.streak_30_days.v1',
    tenantId: null,
    eventType: 'streak_30_days',
    source: 'engagement',
    coins: 50,
    xp: 300,
    cooldownType: 'once_per_streak',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  // Content domain
  {
    id: 'content.game_created.v1',
    tenantId: null,
    eventType: 'game_created',
    source: 'content',
    coins: 8,
    xp: 40,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  {
    id: 'content.game_published.v1',
    tenantId: null,
    eventType: 'game_published',
    source: 'content',
    coins: 15,
    xp: 100,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  // Social domain
  {
    id: 'social.invite_accepted.v1',
    tenantId: null,
    eventType: 'invite_accepted',
    source: 'social',
    coins: 20,
    xp: 100,
    cooldownType: 'none',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
  // Learning domain
  {
    id: 'learning.tutorial_completed.v1',
    tenantId: null,
    eventType: 'tutorial_completed',
    source: 'learning',
    coins: 15,
    xp: 100,
    cooldownType: 'once',
    baseMultiplier: 1.0,
    conditions: [],
    isActive: true,
  },
]

// ============================================================================
// RULE RESOLUTION
// ============================================================================

// Internal type for automation rule row (supports both current and future schema)
interface AutomationRuleRow {
  id: string
  event_type: string
  reward_amount: number
  is_active: boolean
  // Future columns (not yet in production schema)
  xp_amount?: number | null
  cooldown_type?: string | null
  base_multiplier?: number | null
  conditions?: unknown[] | null
}

/**
 * Find the applicable rule for an event.
 * Priority: tenant-specific rule > global rule
 */
async function resolveRule(
  admin: ReturnType<typeof createServiceRoleClient>,
  tenantId: string | null,
  eventType: string,
  source: GamificationSource
): Promise<RewardRule | null> {
  // First, check for tenant-specific rule in DB
  if (tenantId) {
    const { data: rawRule } = await admin
      .from('gamification_automation_rules')
      .select('id, event_type, reward_amount, is_active')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    const tenantRule = rawRule as AutomationRuleRow | null

    if (tenantRule) {
      return {
        id: tenantRule.id,
        tenantId,
        eventType: tenantRule.event_type,
        source,
        coins: tenantRule.reward_amount ?? 0,
        xp: tenantRule.xp_amount ?? 0,
        cooldownType: (tenantRule.cooldown_type as CooldownType) ?? 'none',
        baseMultiplier: tenantRule.base_multiplier ?? 1.0,
        conditions: (tenantRule.conditions as RewardCondition[]) ?? [],
        isActive: tenantRule.is_active,
      }
    }
  }

  // Check for global rule in DB
  const { data: rawGlobalRule } = await admin
    .from('gamification_automation_rules')
    .select('id, event_type, reward_amount, is_active')
    .is('tenant_id', null)
    .eq('event_type', eventType)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const globalDbRule = rawGlobalRule as AutomationRuleRow | null

  if (globalDbRule) {
    return {
      id: globalDbRule.id,
      tenantId: null,
      eventType: globalDbRule.event_type,
      source,
      coins: globalDbRule.reward_amount ?? 0,
      xp: globalDbRule.xp_amount ?? 0,
      cooldownType: (globalDbRule.cooldown_type as CooldownType) ?? 'none',
      baseMultiplier: globalDbRule.base_multiplier ?? 1.0,
      conditions: (globalDbRule.conditions as RewardCondition[]) ?? [],
      isActive: globalDbRule.is_active,
    }
  }

  // Fall back to hardcoded global rules
  return GLOBAL_REWARD_RULES.find(
    (r) => r.source === source && r.eventType === eventType && r.isActive
  ) ?? null
}

// ============================================================================
// COOLDOWN RESOLUTION
// ============================================================================

interface CooldownCheckResult {
  eligible: boolean
  lastTriggeredAt: string | null
  triggerCount: number
  streakId: number | null
}

/**
 * Check if the user is eligible based on cooldown rules.
 * Uses the new gamification_cooldowns table.
 */
async function checkCooldown(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  eventType: string,
  cooldownType: CooldownType
): Promise<CooldownCheckResult> {
  if (cooldownType === 'none') {
    return { eligible: true, lastTriggeredAt: null, triggerCount: 0, streakId: null }
  }

  // Get current streak ID for once_per_streak cooldowns
  let streakId: number | null = null
  if (cooldownType === 'once_per_streak' && tenantId) {
    const { data: streak } = await admin
      .from('user_streaks')
      .select('current_streak_days')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId!) // tenantId is guaranteed non-null here
      .maybeSingle()

    // Use current_streak_days as a pseudo-streak-id
    // When streak resets to 0/1, it's a new streak period
    streakId = streak?.current_streak_days ?? 0
  }

  const { data, error } = await (admin.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    'check_cooldown_eligible_v1',
    {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_event_type: eventType,
      p_cooldown_type: cooldownType,
      p_streak_id: streakId,
    }
  )

  if (error) {
    console.error('[cooldown] check failed', error)
    // Fail open: allow the reward if we can't check
    return { eligible: true, lastTriggeredAt: null, triggerCount: 0, streakId }
  }

  const rows = data as { eligible: boolean; last_triggered_at: string | null; trigger_count: number }[] | null
  const row = rows?.[0]
  return {
    eligible: row?.eligible ?? true,
    lastTriggeredAt: row?.last_triggered_at ?? null,
    triggerCount: row?.trigger_count ?? 0,
    streakId,
  }
}

/**
 * Record that a cooldown trigger occurred.
 */
async function recordCooldownTrigger(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  eventType: string,
  cooldownType: CooldownType,
  streakId: number | null
): Promise<void> {
  if (cooldownType === 'none') return

  await (admin.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>)(
    'record_cooldown_trigger_v1',
    {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_event_type: eventType,
      p_cooldown_type: cooldownType,
      p_streak_id: streakId,
    }
  )
}

// ============================================================================
// MULTIPLIER STACKING
// ============================================================================

interface MultiplierStackResult {
  effectiveMultiplier: number
  sources: MultiplierSource[]
  capped: boolean
}

/**
 * Gather and stack all applicable multipliers, capping at MAX_MULTIPLIER_CAP (2.0x).
 * 
 * Multiplier sources (in order of application):
 * 1. Rule base multiplier
 * 2. Streak bonus (7+ days = 1.5x)
 * 3. Weekend bonus (Sat/Sun = 1.25x)
 * 4. Active campaign bonus
 * 5. Powerup effects
 * 6. Level bonus (Level 5+ = 1.1x)
 * 
 * Stacking: multiplicative, then capped at 2.0x
 */
async function calculateMultiplierStack(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  eventType: string,
  eventAt: string,
  ruleBaseMultiplier: number
): Promise<MultiplierStackResult> {
  const sources: MultiplierSource[] = []
  let accumulated = ruleBaseMultiplier

  // 1. Base multiplier from rule
  if (ruleBaseMultiplier !== 1.0) {
    sources.push({
      source: 'streak', // Using as generic 'rule' source
      multiplier: ruleBaseMultiplier,
      description: `Rule base: ${ruleBaseMultiplier}x`,
    })
  }

  if (!tenantId) {
    // No tenant = no additional multipliers
    return {
      effectiveMultiplier: Math.min(accumulated, MAX_MULTIPLIER_CAP),
      sources,
      capped: accumulated > MAX_MULTIPLIER_CAP,
    }
  }

  // 2. Streak bonus
  const { data: streak } = await admin
    .from('user_streaks')
    .select('current_streak_days')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const streakDays = streak?.current_streak_days ?? 0
  if (streakDays >= 7) {
    const streakMultiplier = 1.5
    accumulated *= streakMultiplier
    sources.push({
      source: 'streak',
      multiplier: streakMultiplier,
      description: `Streak ${streakDays} days: ${streakMultiplier}x`,
    })
  }

  // 3. Weekend bonus
  const eventDate = new Date(eventAt)
  const dayOfWeek = eventDate.getUTCDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const weekendMultiplier = 1.25
    accumulated *= weekendMultiplier
    sources.push({
      source: 'weekend',
      multiplier: weekendMultiplier,
      description: `Weekend bonus: ${weekendMultiplier}x`,
    })
  }

  // 4. Active campaign bonus
  try {
    const { data: campaigns } = await admin
      .from('gamification_campaigns')
      .select('id, name, bonus_amount')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lte('starts_at', eventAt)
      .gte('ends_at', eventAt)
      .eq('event_type', eventType)
      .limit(1)

    if (campaigns && campaigns.length > 0) {
      const campaign = campaigns[0]
      // Treat bonus_amount as a percentage (e.g., 50 = 1.5x)
      const campaignMultiplier = 1 + (campaign.bonus_amount ?? 0) / 100
      if (campaignMultiplier > 1) {
        accumulated *= campaignMultiplier
        sources.push({
          source: 'campaign',
          multiplier: campaignMultiplier,
          effectId: campaign.id,
          description: `Campaign "${campaign.name}": ${campaignMultiplier}x`,
        })
      }
    }
  } catch {
    // Campaign table might not exist or query failed - continue
  }

  // 5. Powerup effects
  try {
    const { data: powerupData } = await admin.rpc('get_active_coin_multiplier_v1', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_at: eventAt,
    })

    const powerup = powerupData?.[0]
    if (powerup && Number(powerup.multiplier) > 1) {
      const powerupMultiplier = Number(powerup.multiplier)
      accumulated *= powerupMultiplier
      sources.push({
        source: 'powerup',
        multiplier: powerupMultiplier,
        effectId: powerup.effect_id,
        description: `Powerup: ${powerupMultiplier}x`,
      })
    }
  } catch {
    // Powerup function might not exist - continue
  }

  // 6. Level bonus
  const { data: progress } = await admin
    .from('user_progress')
    .select('level')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const level = progress?.level ?? 1
  if (level >= 5) {
    // 10% bonus per level above 4
    const levelMultiplier = 1 + (level - 4) * 0.1
    accumulated *= levelMultiplier
    sources.push({
      source: 'level',
      multiplier: levelMultiplier,
      description: `Level ${level} bonus: ${levelMultiplier.toFixed(2)}x`,
    })
  }

  // Cap at MAX_MULTIPLIER_CAP
  const capped = accumulated > MAX_MULTIPLIER_CAP
  const effectiveMultiplier = Math.min(accumulated, MAX_MULTIPLIER_CAP)

  return { effectiveMultiplier, sources, capped }
}

// ============================================================================
// SOFTCAP APPLICATION
// ============================================================================

interface SoftcapResult {
  adjustedCoins: number
  adjustedXp: number
  applied: boolean
  coinsReduced: number
  xpReduced: number
}

/**
 * Apply softcap diminishing returns based on daily earnings.
 */
async function applySoftcap(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  baseCoins: number,
  baseXp: number,
  multiplier: number
): Promise<SoftcapResult> {
  if (!tenantId) {
    // No tenant = no softcap tracking
    const coins = Math.max(0, Math.round(baseCoins * multiplier))
    const xp = Math.max(0, Math.round(baseXp * multiplier))
    return { adjustedCoins: coins, adjustedXp: xp, applied: false, coinsReduced: 0, xpReduced: 0 }
  }

  // Type assertion: RPC function defined in migration 20260108200000
  const { data, error } = await (admin.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    'calculate_softcap_reward_v1',
    {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_base_coins: baseCoins,
      p_base_xp: baseXp,
      p_multiplier: multiplier,
    }
  )

  if (error) {
    console.error('[softcap] calculation failed', error)
    // Fail open: return uncapped values
    const coins = Math.max(0, Math.round(baseCoins * multiplier))
    const xp = Math.max(0, Math.round(baseXp * multiplier))
    return { adjustedCoins: coins, adjustedXp: xp, applied: false, coinsReduced: 0, xpReduced: 0 }
  }

  const rows = data as { adjusted_coins: number; adjusted_xp: number; softcap_applied: boolean; coins_reduced: number; xp_reduced: number }[] | null
  const row = rows?.[0]
  return {
    adjustedCoins: row?.adjusted_coins ?? Math.round(baseCoins * multiplier),
    adjustedXp: row?.adjusted_xp ?? Math.round(baseXp * multiplier),
    applied: row?.softcap_applied ?? false,
    coinsReduced: row?.coins_reduced ?? 0,
    xpReduced: row?.xp_reduced ?? 0,
  }
}

/**
 * Record daily earnings for future softcap calculations.
 */
async function recordDailyEarnings(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  coins: number,
  xp: number,
  coinsRaw: number,
  xpRaw: number,
  coinsReduced: number,
  xpReduced: number
): Promise<void> {
  if (!tenantId) return

  // Type assertion: RPC function defined in migration 20260108200000
  await (admin.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>)(
    'record_daily_earning_v1',
    {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_coins: coins,
      p_xp: xp,
      p_coins_raw: coinsRaw,
      p_xp_raw: xpRaw,
      p_coins_reduced: coinsReduced,
      p_xp_reduced: xpReduced,
    }
  )
}

// ============================================================================
// XP APPLICATION
// ============================================================================

/**
 * Apply XP to user progress, handling level-ups.
 */
async function applyXp(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  tenantId: string | null,
  xpAmount: number,
  _eventId: string
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean } | null> {
  if (xpAmount <= 0 || !tenantId) return null

  const XP_PER_LEVEL = 1000

  // Get or create user progress
  const { data: progress } = await admin
    .from('user_progress')
    .select('id, level, current_xp, next_level_xp')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const currentXp = progress?.current_xp ?? 0
  const currentLevel = progress?.level ?? 1

  const newXp = currentXp + xpAmount
  let newLevel = currentLevel

  // Check for level-ups
  while (newXp >= newLevel * XP_PER_LEVEL) {
    newLevel++
  }

  const leveledUp = newLevel > currentLevel

  if (progress?.id) {
    await admin
      .from('user_progress')
      .update({
        current_xp: newXp,
        level: newLevel,
        next_level_xp: newLevel * XP_PER_LEVEL,
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)
  } else {
    await admin.from('user_progress').insert({
      user_id: userId,
      tenant_id: tenantId,
      level: newLevel,
      current_xp: newXp,
      next_level_xp: newLevel * XP_PER_LEVEL,
    })
  }

  return { newXp, newLevel, leveledUp }
}

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate and apply rewards for a gamification event.
 * 
 * This is the main entry point for the reward evaluation engine.
 * It handles:
 * - Rule resolution (tenant-specific → global → hardcoded)
 * - Cooldown checking
 * - Multiplier stacking with 2.0x cap
 * - Softcap diminishing returns
 * - Idempotent coin/XP application
 * 
 * @param input Event details
 * @returns Detailed result of reward evaluation
 */
export async function evaluateAndApplyRewardV2(
  input: EvaluateRewardInput
): Promise<EvaluateRewardResult> {
  const admin = createServiceRoleClient()

  // Default result for no reward
  const noReward: EvaluateRewardResult = {
    applied: false,
    skipped: true,
    coinTransactionId: null,
    xpTransactionId: null,
    balance: null,
    xp: null,
    ruleId: null,
    baseCoins: 0,
    baseXp: 0,
    adjustedCoins: 0,
    adjustedXp: 0,
    effectiveMultiplier: 1,
    softcapApplied: false,
    cooldownBlocked: false,
    multiplierSources: [],
  }

  // 1. Resolve applicable rule
  const rule = await resolveRule(admin, input.tenantId, input.eventType, input.source)
  if (!rule) {
    return { ...noReward, skipReason: 'no_matching_rule' }
  }

  // 2. Check cooldown eligibility
  const cooldown = await checkCooldown(
    admin,
    input.actorUserId,
    input.tenantId,
    input.eventType,
    rule.cooldownType
  )

  if (!cooldown.eligible) {
    return {
      ...noReward,
      skipReason: `cooldown_blocked:${rule.cooldownType}`,
      cooldownBlocked: true,
      ruleId: rule.id,
    }
  }

  // 3. Calculate multiplier stack
  const multipliers = await calculateMultiplierStack(
    admin,
    input.actorUserId,
    input.tenantId,
    input.eventType,
    input.eventCreatedAt,
    rule.baseMultiplier
  )

  // 4. Apply softcap
  const softcap = await applySoftcap(
    admin,
    input.actorUserId,
    input.tenantId,
    rule.coins,
    rule.xp,
    multipliers.effectiveMultiplier
  )

  // 5. Apply coin reward (idempotent)
  let coinTransactionId: string | null = null
  let balance: number | null = null

  if (softcap.adjustedCoins > 0 && input.tenantId) {
    const idempotencyKey = `evt:${input.eventId}:rule:${rule.id}:coins:v2`

    const { data, error } = await admin.rpc('apply_coin_transaction_v1', {
      p_user_id: input.actorUserId,
      p_tenant_id: input.tenantId,
      p_type: 'earn',
      p_amount: softcap.adjustedCoins,
      p_reason_code: `event:${input.eventType}`,
      p_idempotency_key: idempotencyKey,
      p_description: `Reward for ${input.eventType}`,
      p_source: input.source,
      p_metadata: {
        eventId: input.eventId,
        eventType: input.eventType,
        ruleId: rule.id,
        baseCoins: rule.coins,
        baseXp: rule.xp,
        adjustedCoins: softcap.adjustedCoins,
        adjustedXp: softcap.adjustedXp,
        effectiveMultiplier: multipliers.effectiveMultiplier,
        multiplierCapped: multipliers.capped,
        softcapApplied: softcap.applied,
        coinsReduced: softcap.coinsReduced,
        xpReduced: softcap.xpReduced,
        multiplierSources: multipliers.sources,
      } as unknown as Json,
    })

    if (!error && data?.[0]) {
      coinTransactionId = data[0].transaction_id
      balance = data[0].balance
    }
  }

  // 6. Apply XP reward
  let xp: number | null = null
  if (softcap.adjustedXp > 0) {
    const xpResult = await applyXp(
      admin,
      input.actorUserId,
      input.tenantId,
      softcap.adjustedXp,
      input.eventId
    )
    if (xpResult) {
      xp = xpResult.newXp
    }
  }

  // 7. Record cooldown trigger
  await recordCooldownTrigger(
    admin,
    input.actorUserId,
    input.tenantId,
    input.eventType,
    rule.cooldownType,
    cooldown.streakId
  )

  // 8. Record daily earnings for softcap tracking
  const rawCoins = Math.round(rule.coins * multipliers.effectiveMultiplier)
  const rawXp = Math.round(rule.xp * multipliers.effectiveMultiplier)
  await recordDailyEarnings(
    admin,
    input.actorUserId,
    input.tenantId,
    softcap.adjustedCoins,
    softcap.adjustedXp,
    rawCoins,
    rawXp,
    softcap.coinsReduced,
    softcap.xpReduced
  )

  return {
    applied: true,
    skipped: false,
    coinTransactionId,
    xpTransactionId: null, // XP doesn't have a transaction table
    balance,
    xp,
    ruleId: rule.id,
    baseCoins: rule.coins,
    baseXp: rule.xp,
    adjustedCoins: softcap.adjustedCoins,
    adjustedXp: softcap.adjustedXp,
    effectiveMultiplier: multipliers.effectiveMultiplier,
    softcapApplied: softcap.applied,
    cooldownBlocked: false,
    multiplierSources: multipliers.sources,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an event type has a cooldown that would block a reward.
 * Useful for pre-flight checks in UI.
 */
export async function checkRewardCooldownStatus(
  tenantId: string | null,
  userId: string,
  eventType: string,
  source: GamificationSource
): Promise<{ eligible: boolean; cooldownType: CooldownType; lastTriggeredAt: string | null }> {
  const admin = createServiceRoleClient()

  const rule = await resolveRule(admin, tenantId, eventType, source)
  if (!rule) {
    return { eligible: true, cooldownType: 'none', lastTriggeredAt: null }
  }

  const cooldown = await checkCooldown(admin, userId, tenantId, eventType, rule.cooldownType)

  return {
    eligible: cooldown.eligible,
    cooldownType: rule.cooldownType,
    lastTriggeredAt: cooldown.lastTriggeredAt,
  }
}

/**
 * Preview what reward would be given for an event (without applying).
 * Useful for showing expected rewards in UI.
 */
export async function previewReward(
  input: EvaluateRewardInput
): Promise<{
  coins: number
  xp: number
  multiplier: number
  softcapApplied: boolean
  cooldownBlocked: boolean
  ruleId: string | null
}> {
  const admin = createServiceRoleClient()

  const rule = await resolveRule(admin, input.tenantId, input.eventType, input.source)
  if (!rule) {
    return { coins: 0, xp: 0, multiplier: 1, softcapApplied: false, cooldownBlocked: false, ruleId: null }
  }

  const cooldown = await checkCooldown(
    admin,
    input.actorUserId,
    input.tenantId,
    input.eventType,
    rule.cooldownType
  )

  if (!cooldown.eligible) {
    return { coins: 0, xp: 0, multiplier: 1, softcapApplied: false, cooldownBlocked: true, ruleId: rule.id }
  }

  const multipliers = await calculateMultiplierStack(
    admin,
    input.actorUserId,
    input.tenantId,
    input.eventType,
    input.eventCreatedAt,
    rule.baseMultiplier
  )

  const softcap = await applySoftcap(
    admin,
    input.actorUserId,
    input.tenantId,
    rule.coins,
    rule.xp,
    multipliers.effectiveMultiplier
  )

  return {
    coins: softcap.adjustedCoins,
    xp: softcap.adjustedXp,
    multiplier: multipliers.effectiveMultiplier,
    softcapApplied: softcap.applied,
    cooldownBlocked: false,
    ruleId: rule.id,
  }
}
