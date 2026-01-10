/**
 * Achievement Check API for Authenticated Users
 * 
 * POST /api/gamification/achievements/check
 * 
 * Check if the user qualifies for any achievements based on provided context.
 * Automatically unlocks achievements when conditions are met.
 * 
 * SECURITY NOTES:
 * - Uses RLS client for auth, service role for DB operations
 * - Tenant resolved from memberships, not user_progress
 * 
 * HARDENED in Phase 4.1:
 * - Production mode: only allows stat-free triggers (first_login, profile_completed)
 * - Stats-based triggers blocked in production until server-side computation exists
 * - Defense-in-depth: filters returned achievements by tenant + status
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkAndUnlockAchievements } from '@/lib/services/achievementService';

// Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Triggers that do NOT require client stats (safe in production)
const STAT_FREE_TRIGGERS = ['first_login', 'profile_completed'] as const;

// Triggers that require stats (blocked in production without server-side stats)
const STATS_REQUIRED_TRIGGERS = ['game_completed', 'streak_updated', 'coins_earned', 'level_up', 'custom'] as const;

const checkRequestSchema = z.object({
  // Context of what triggered the check
  trigger: z.enum([
    ...STAT_FREE_TRIGGERS,
    ...STATS_REQUIRED_TRIGGERS,
  ]),
  // Stats for condition checking
  // WARNING: In production, stats-requiring triggers are blocked.
  stats: z
    .object({
      totalGames: z.number().int().min(0).optional(),
      totalScore: z.number().int().min(0).optional(),
      bestScore: z.number().int().min(0).optional(),
      sessionCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

/**
 * Resolve user's active tenant from memberships
 * Priority: primary > single membership > undefined
 */
async function resolveUserTenant(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<string | undefined> {
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, is_primary, status')
    .eq('user_id', userId)
    .in('status', ['active', null]);

  if (!memberships || memberships.length === 0) {
    return undefined;
  }

  // Prefer primary membership
  const primary = memberships.find((m) => m.is_primary);
  if (primary) {
    return primary.tenant_id;
  }

  // Single membership
  if (memberships.length === 1) {
    return memberships[0].tenant_id;
  }

  // Multiple memberships, no primary - use first
  return memberships[0].tenant_id;
}

export async function POST(request: NextRequest) {
  try {
    // RLS client for auth check
    const rlsClient = await createServerRlsClient();
    // Service role for DB operations
    const serviceClient = createServiceRoleClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await rlsClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = checkRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { trigger, stats } = parsed.data;

    // P0.1 HARDENING: Block stats-requiring triggers in production
    const isStatFreeTrigger = (STAT_FREE_TRIGGERS as readonly string[]).includes(trigger);
    
    if (IS_PRODUCTION && !isStatFreeTrigger) {
      return NextResponse.json(
        {
          error: 'STATS_NOT_SERVER_AUTHORITATIVE',
          message: 'This trigger requires server-side stats computation which is not yet implemented. ' +
                   'Use first_login or profile_completed triggers, or wait for server-side stats support.',
          trigger,
          allowedTriggers: STAT_FREE_TRIGGERS,
        },
        { status: 400 }
      );
    }

    // Resolve tenant from memberships (not user_progress)
    const tenantId = await resolveUserTenant(serviceClient, user.id);

    // Use the achievement service to check and unlock
    // NOTE: checkAndUnlockAchievements uses its own DB client internally
    const unlockedAchievements = await checkAndUnlockAchievements(
      user.id,
      stats ?? {},
      tenantId
    );

    // P0.2 DEFENSE-IN-DEPTH: Filter achievements by tenant + status
    // Only return achievements that are active and accessible to this user
    const achievementDetails: Array<{
      id: string;
      name: string;
      description: string;
      iconUrl: string | null;
      points: number;
      unlockedAt: string;
    }> = [];

    for (const ua of unlockedAchievements) {
      const { data: achievement } = await serviceClient
        .from('achievements')
        .select('id, name, description, icon_url, condition_value, status, tenant_id')
        .eq('id', ua.achievement_id)
        .single();

      // Filter: must be active AND (global OR same tenant)
      if (!achievement) {
        console.warn(`[WARN] Achievement ${ua.achievement_id} not found after unlock`);
        continue;
      }
      
      if (achievement.status !== 'active') {
        console.warn(`[WARN] Achievement ${ua.achievement_id} is not active (status: ${achievement.status})`);
        continue;
      }
      
      if (achievement.tenant_id !== null && achievement.tenant_id !== tenantId) {
        console.warn(`[WARN] Achievement ${ua.achievement_id} tenant mismatch (achievement: ${achievement.tenant_id}, user: ${tenantId})`);
        continue;
      }

      achievementDetails.push({
        id: ua.achievement_id,
        name: achievement.name || 'Achievement',
        description: achievement.description || '',
        iconUrl: achievement.icon_url || null,
        points: achievement.condition_value || 0,
        unlockedAt: ua.unlocked_at,
      });
    }

    // Build response with dev warning if applicable
    const response: Record<string, unknown> = {
      success: true,
      trigger,
      unlockedCount: achievementDetails.length,
      achievements: achievementDetails,
    };

    // Add warning in non-production when client stats are used
    if (!IS_PRODUCTION && !isStatFreeTrigger && stats) {
      response.warning = 'client_stats_trusted_dev_only';
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('Error in achievement check API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
