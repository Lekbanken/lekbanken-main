import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/server'

export type GamificationAchievementSource = 'planner' | 'play' | 'admin' | 'system'

export type ApplyGamificationAchievementsForEventV1Input = {
  eventId: string
  eventCreatedAt?: string | null
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationAchievementSource
  metadata?: Record<string, unknown> | null
}

export type ApplyGamificationAchievementsForEventV1Result = {
  evaluated: boolean
  unlockedCount: number
  achievementIds: string[]
}

// Minimal MVP: unlock achievements that directly map 1:1 to an event type.
// We only auto-unlock when condition_value is NULL or <= 1 (event presence).
export async function applyGamificationAchievementsForEventV1(
  input: ApplyGamificationAchievementsForEventV1Input
): Promise<ApplyGamificationAchievementsForEventV1Result> {
  const admin = createServiceRoleClient()

  const unlockedIds = new Set<string>()
  let unlockedCount = 0
  const nowIso = new Date().toISOString()

  if ((input.eventType === 'session_completed' || input.eventType === 'run_completed') && input.tenantId) {
    const { count: completedCount, error: countError } = await admin
      .from('gamification_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenantId)
      .eq('actor_user_id', input.actorUserId)
      .eq('source', 'play')
      .eq('event_type', 'session_completed')

    if (countError) {
      throw countError
    }

    const totalCompleted = Number(completedCount ?? 0)
    if (totalCompleted > 0) {
      const { data: milestones, error: milestonesError } = await admin
        .from('achievements')
        .select('id,condition_value')
        .eq('condition_type', 'session_count')

      if (milestonesError) {
        throw milestonesError
      }

      const targetIds = (milestones ?? []) as Array<{ id: string; condition_value: number | null }>
      for (const a of targetIds) {
        if (typeof a.condition_value !== 'number') continue
        if (a.condition_value <= 0) continue
        if (a.condition_value > totalCompleted) continue

        const { error: insertError } = await admin
          .from('user_achievements')
          .insert({
            achievement_id: a.id,
            user_id: input.actorUserId,
            tenant_id: input.tenantId,
            created_at: nowIso,
            unlocked_at: nowIso,
          })

        if (!insertError) {
          unlockedCount += 1
          unlockedIds.add(a.id)
          continue
        }

        const code = String(insertError.code ?? '')
        if (code === '23505') {
          unlockedIds.add(a.id)
          continue
        }
        throw insertError
      }
    }

    // Score milestones (best and total score within tenant)
    try {
      const { data: sessions, error: sessionsError } = await admin
        .from('game_sessions')
        .select('score')
        .eq('tenant_id', input.tenantId)
        .eq('user_id', input.actorUserId)
        .eq('status', 'completed')

      if (sessionsError) {
        throw sessionsError
      }

      const rows = (sessions ?? []) as Array<{ score: number | null }>
      const bestScore = rows.reduce((m, r) => Math.max(m, Number(r.score ?? 0)), 0)
      const totalScore = rows.reduce((sum, r) => sum + Number(r.score ?? 0), 0)

      // best_score + score_milestone
      if (bestScore > 0) {
        const { data: scoreMilestones, error: scoreMilestonesError } = await admin
          .from('achievements')
          .select('id,condition_value')
          .in('condition_type', ['score_milestone', 'best_score'])

        if (scoreMilestonesError) {
          throw scoreMilestonesError
        }

        const candidates = (scoreMilestones ?? []) as Array<{ id: string; condition_value: number | null }>
        for (const a of candidates) {
          if (typeof a.condition_value !== 'number') continue
          if (a.condition_value <= 0) continue
          if (a.condition_value > bestScore) continue

          const { error: insertError } = await admin
            .from('user_achievements')
            .insert({
              achievement_id: a.id,
              user_id: input.actorUserId,
              tenant_id: input.tenantId,
              created_at: nowIso,
              unlocked_at: nowIso,
            })

          if (!insertError) {
            unlockedCount += 1
            unlockedIds.add(a.id)
            continue
          }

          const code = String(insertError.code ?? '')
          if (code === '23505') {
            unlockedIds.add(a.id)
            continue
          }
          throw insertError
        }
      }

      // total_score
      if (totalScore > 0) {
        const { data: totalMilestones, error: totalMilestonesError } = await admin
          .from('achievements')
          .select('id,condition_value')
          .eq('condition_type', 'total_score')

        if (totalMilestonesError) {
          throw totalMilestonesError
        }

        const candidates = (totalMilestones ?? []) as Array<{ id: string; condition_value: number | null }>
        for (const a of candidates) {
          if (typeof a.condition_value !== 'number') continue
          if (a.condition_value <= 0) continue
          if (a.condition_value > totalScore) continue

          const { error: insertError } = await admin
            .from('user_achievements')
            .insert({
              achievement_id: a.id,
              user_id: input.actorUserId,
              tenant_id: input.tenantId,
              created_at: nowIso,
              unlocked_at: nowIso,
            })

          if (!insertError) {
            unlockedCount += 1
            unlockedIds.add(a.id)
            continue
          }

          const code = String(insertError.code ?? '')
          if (code === '23505') {
            unlockedIds.add(a.id)
            continue
          }
          throw insertError
        }
      }
    } catch (err) {
      // Keep achievements evaluation resilient across environments.
      // If play-domain scoring tables aren't present yet, skip score milestones.
      const message = String((err as { message?: unknown })?.message ?? '')
      if (!message.toLowerCase().includes('game_sessions')) {
        throw err
      }
    }
  }

  const { data: matching, error: matchError } = await admin
    .from('achievements')
    .select('id,condition_type,condition_value')
    .eq('condition_type', input.eventType)

  if (matchError) {
    throw matchError
  }

  const candidates = (matching ?? []) as Array<{ id: string; condition_type: string; condition_value: number | null }>
  const unlockIds = candidates
    .filter((a) => a.condition_value == null || a.condition_value <= 1)
    .map((a) => a.id)

  if (unlockIds.length === 0) {
    return { evaluated: true, unlockedCount, achievementIds: Array.from(unlockedIds) }
  }

  for (const achievementId of unlockIds) {
    const insertPayload = {
      achievement_id: achievementId,
      user_id: input.actorUserId,
      tenant_id: input.tenantId,
      // store minimal event info for auditing/debugging (no PII beyond ids)
      created_at: nowIso,
      unlocked_at: nowIso,
    }

    const { error: insertError } = await admin
      .from('user_achievements')
      .insert(insertPayload)

    if (!insertError) {
      unlockedCount += 1
      unlockedIds.add(achievementId)
      continue
    }

    const code = String(insertError.code ?? '')
    if (code === '23505') {
      // Idempotent: already unlocked
      unlockedIds.add(achievementId)
      continue
    }

    throw insertError
  }

  // Optional: attach an audit breadcrumb in event metadata via coins function already; keep this minimal.
  // Keep return shape stable.
  return { evaluated: true, unlockedCount, achievementIds: Array.from(unlockedIds) }
}
