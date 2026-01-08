import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'
import {
  evaluateAndApplyRewardV2,
  type GamificationSource,
  type EvaluateRewardResult,
} from './gamification-reward-engine.server'
import { applyGamificationAchievementsForEventV1 } from './gamification-achievements.server'

// ============================================================================
// TYPES
// ============================================================================

export type LogGamificationEventV2Input = {
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationSource
  idempotencyKey: string
  metadata?: Record<string, unknown> | null
}

export type LogGamificationEventV2Result = {
  eventId: string | null
  idempotent: boolean
  reward: EvaluateRewardResult | null
  achievementsUnlocked: string[]
}

// ============================================================================
// CAMPAIGN BONUS APPLICATION
// ============================================================================

async function applyCampaignBonusesForEventV2(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  eventId: string
  eventType: string
}): Promise<void> {
  if (!args.tenantId) return

  const nowIso = new Date().toISOString()
  const { data: campaigns, error } = await args.admin
    .from('gamification_campaigns')
    .select('id, event_type, bonus_amount')
    .eq('tenant_id', args.tenantId)
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .gte('ends_at', nowIso)
    .eq('event_type', args.eventType)

  if (error || !Array.isArray(campaigns) || campaigns.length === 0) return

  // Campaign bonuses are now handled in the multiplier stack
  // This function is kept for backward compatibility and additional campaign logic
  for (const campaign of campaigns) {
    const campaignId = campaign.id
    if (!campaignId) continue

    try {
      await args.admin.rpc('apply_campaign_bonus_v1', {
        p_campaign_id: campaignId,
        p_user_id: args.actorUserId,
        p_tenant_id: args.tenantId,
        p_event_id: args.eventId,
        p_event_type: args.eventType,
        p_idempotency_key: `evt:${args.eventId}:campaign:${campaignId}:coins:v2`,
      })
    } catch (e) {
      console.warn('[gamification] campaign bonus application failed', e)
    }
  }
}

// ============================================================================
// AUTOMATION RULES APPLICATION (Legacy)
// ============================================================================

async function _applyAutomationRulesForEventV2(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  eventId: string
  eventType: string
}): Promise<void> {
  // Automation rules are now integrated into the main reward engine
  // This function is kept for backward compatibility with tenant-specific rules
  // that use the old automation_rules table directly
  if (!args.tenantId) return

  const { data: rules, error } = await args.admin
    .from('gamification_automation_rules')
    .select('id, event_type, reward_amount')
    .eq('tenant_id', args.tenantId)
    .eq('is_active', true)
    .eq('event_type', args.eventType)

  if (error || !Array.isArray(rules) || rules.length === 0) return

  // Note: Main reward is already handled by evaluateAndApplyRewardV2
  // This only handles legacy tenant-specific automation rules that
  // might have additional side effects beyond coin rewards
}

// ============================================================================
// STREAK TRIGGER EVENTS
// ============================================================================

/**
 * Check and emit streak milestone events based on current streak.
 */
async function checkAndEmitStreakEvents(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  source: GamificationSource
}): Promise<string[]> {
  if (!args.tenantId) return []

  const { data: streak } = await args.admin
    .from('user_streaks')
    .select('current_streak_days')
    .eq('user_id', args.actorUserId)
    .eq('tenant_id', args.tenantId)
    .maybeSingle()

  const streakDays = streak?.current_streak_days ?? 0
  const emittedEvents: string[] = []

  // Define streak milestones
  const streakMilestones = [
    { days: 3, eventType: 'streak_3_days' },
    { days: 7, eventType: 'streak_7_days' },
    { days: 30, eventType: 'streak_30_days' },
    { days: 100, eventType: 'streak_100_days' },
  ]

  for (const milestone of streakMilestones) {
    if (streakDays >= milestone.days) {
      // The cooldown system (once_per_streak) will handle deduplication
      const streakIdempotencyKey = `streak:${args.actorUserId}:${args.tenantId}:${milestone.eventType}:${streakDays}`

      const result = await logGamificationEventV2({
        tenantId: args.tenantId,
        actorUserId: args.actorUserId,
        eventType: milestone.eventType,
        source: 'engagement',
        idempotencyKey: streakIdempotencyKey,
        metadata: { streakDays, milestone: milestone.days },
      })

      if (result.reward?.applied) {
        emittedEvents.push(milestone.eventType)
      }
    }
  }

  return emittedEvents
}

// ============================================================================
// FIRST-TIME EVENT DETECTION
// ============================================================================

/**
 * Check if this is the user's first occurrence of an event type.
 */
async function checkAndEmitFirstTimeEvent(args: {
  admin: ReturnType<typeof createServiceRoleClient>
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationSource
}): Promise<{ emitted: boolean; firstEventType: string | null }> {
  if (!args.tenantId) return { emitted: false, firstEventType: null }

  // Map base events to first-time events
  const firstTimeMapping: Record<string, string> = {
    session_completed: 'first_session',
    plan_created: 'first_plan',
    game_created: 'first_game',
    tutorial_completed: 'first_tutorial',
  }

  const firstEventType = firstTimeMapping[args.eventType]
  if (!firstEventType) return { emitted: false, firstEventType: null }

  // Check if user has any previous events of this base type
  const { count } = await args.admin
    .from('gamification_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', args.tenantId)
    .eq('actor_user_id', args.actorUserId)
    .eq('event_type', args.eventType)

  // If this is the first (count would be 1 including current), emit first-time event
  if (count === 1) {
    const firstIdempotencyKey = `first:${args.actorUserId}:${args.tenantId}:${firstEventType}`

    await logGamificationEventV2({
      tenantId: args.tenantId,
      actorUserId: args.actorUserId,
      eventType: firstEventType,
      source: args.source,
      idempotencyKey: firstIdempotencyKey,
      metadata: { baseEventType: args.eventType },
    })

    return { emitted: true, firstEventType }
  }

  return { emitted: false, firstEventType: null }
}

// ============================================================================
// MAIN EVENT LOGGING FUNCTION (V2)
// ============================================================================

/**
 * Log a gamification event and apply all associated rewards.
 * 
 * This is the V2 implementation that uses the new reward engine with:
 * - Multiplier stacking (capped at 2.0x)
 * - Cooldown resolution
 * - Softcap diminishing returns
 * - Idempotent reward application
 * 
 * Flow:
 * 1. Insert event (idempotent via unique index)
 * 2. Evaluate and apply rewards via reward engine
 * 3. Evaluate and unlock achievements
 * 4. Check for first-time events and streak milestones
 * 5. Apply any campaign bonuses
 */
export async function logGamificationEventV2(
  input: LogGamificationEventV2Input
): Promise<LogGamificationEventV2Result> {
  const admin = createServiceRoleClient()

  const payload = {
    tenant_id: input.tenantId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    source: input.source,
    idempotency_key: input.idempotencyKey,
    metadata: (input.metadata ?? null) as unknown as Json | null,
  }

  // 1. Insert event (idempotent)
  const { data: inserted, error: insertError } = await admin
    .from('gamification_events')
    .insert(payload)
    .select('id, created_at')
    .maybeSingle()

  const isNewEvent = !insertError && inserted?.id
  let eventId: string | null = null
  let eventCreatedAt: string | null = null
  let idempotent = false

  if (isNewEvent) {
    eventId = inserted.id
    eventCreatedAt = inserted.created_at
  } else {
    // Check if it's a duplicate (23505 = unique_violation)
    const code = String(insertError?.code ?? '')
    if (code !== '23505') {
      throw insertError
    }

    // Fetch existing event
    const query = admin
      .from('gamification_events')
      .select('id, created_at')
      .eq('source', input.source)
      .eq('idempotency_key', input.idempotencyKey)

    if (input.tenantId) {
      query.eq('tenant_id', input.tenantId)
    } else {
      query.is('tenant_id', null)
    }

    const { data: existing } = await query.maybeSingle()
    eventId = existing?.id ?? null
    eventCreatedAt = existing?.created_at ?? null
    idempotent = true
  }

  if (!eventId) {
    return { eventId: null, idempotent, reward: null, achievementsUnlocked: [] }
  }

  // 2. Evaluate and apply rewards
  let reward: EvaluateRewardResult | null = null
  try {
    reward = await evaluateAndApplyRewardV2({
      eventId,
      eventCreatedAt: eventCreatedAt ?? new Date().toISOString(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      source: input.source,
      metadata: input.metadata ?? null,
    })
  } catch (e) {
    console.warn('[gamification] reward evaluation failed', e)
  }

  // 3. Evaluate and unlock achievements
  let achievementsUnlocked: string[] = []
  try {
    const achievementResult = await applyGamificationAchievementsForEventV1({
      eventId,
      eventCreatedAt,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      source: input.source as 'planner' | 'play' | 'admin' | 'system',
      metadata: input.metadata ?? null,
    })
    achievementsUnlocked = achievementResult.achievementIds
  } catch (e) {
    console.warn('[gamification] achievement evaluation failed', e)
  }

  // 4. Check for first-time events (only for new events)
  if (isNewEvent) {
    try {
      await checkAndEmitFirstTimeEvent({
        admin,
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        source: input.source,
      })
    } catch (e) {
      console.warn('[gamification] first-time event check failed', e)
    }

    // Check for streak milestones on session completion
    if (input.eventType === 'session_completed' || input.eventType === 'daily_login') {
      try {
        await checkAndEmitStreakEvents({
          admin,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          source: input.source,
        })
      } catch (e) {
        console.warn('[gamification] streak event check failed', e)
      }
    }
  }

  // 5. Apply campaign bonuses (legacy, now integrated into multiplier stack)
  try {
    await applyCampaignBonusesForEventV2({
      admin,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventId,
      eventType: input.eventType,
    })
  } catch (e) {
    console.warn('[gamification] campaign bonus evaluation failed', e)
  }

  return { eventId, idempotent, reward, achievementsUnlocked }
}

// ============================================================================
// HELPER: EMIT DAILY LOGIN EVENT
// ============================================================================

/**
 * Emit a daily login event for a user.
 * Should be called once per day when user logs in.
 * Uses date-based idempotency to ensure once-per-day.
 */
export async function emitDailyLoginEvent(
  tenantId: string,
  userId: string
): Promise<LogGamificationEventV2Result> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const idempotencyKey = `daily_login:${userId}:${tenantId}:${today}`

  return logGamificationEventV2({
    tenantId,
    actorUserId: userId,
    eventType: 'daily_login',
    source: 'engagement',
    idempotencyKey,
    metadata: { loginDate: today },
  })
}

// ============================================================================
// HELPER: UPDATE STREAK ON SESSION
// ============================================================================

/**
 * Update user streak when a session is completed.
 * Should be called when session_completed event is emitted.
 */
export async function updateStreakOnSession(
  tenantId: string,
  userId: string
): Promise<{ currentStreak: number; bestStreak: number; streakMaintained: boolean }> {
  const admin = createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)

  // Get current streak
  const { data: streak } = await admin
    .from('user_streaks')
    .select('id, current_streak_days, best_streak_days, last_active_date')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  let currentStreak = 1
  let bestStreak = streak?.best_streak_days ?? 0
  let streakMaintained = false

  if (streak?.last_active_date) {
    const lastActive = streak.last_active_date
    if (lastActive === today) {
      // Already active today, no change
      currentStreak = streak.current_streak_days ?? 1
      streakMaintained = true
    } else if (lastActive === yesterdayStr) {
      // Continuing streak
      currentStreak = (streak.current_streak_days ?? 0) + 1
      streakMaintained = true
    } else {
      // Streak broken, start new
      currentStreak = 1
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak)

  if (streak?.id) {
    await admin
      .from('user_streaks')
      .update({
        current_streak_days: currentStreak,
        best_streak_days: bestStreak,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
  } else {
    await admin.from('user_streaks').insert({
      user_id: userId,
      tenant_id: tenantId,
      current_streak_days: currentStreak,
      best_streak_days: bestStreak,
      last_active_date: today,
    })
  }

  return { currentStreak, bestStreak, streakMaintained }
}
