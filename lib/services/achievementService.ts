/**
 * Achievement Service
 * 
 * Handles achievement tracking, unlocking, and badge management.
 * Tracks user progress towards achievements and automatically unlocks badges.
 */

import { supabase } from '@/lib/supabase/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Achievement {
  id: string;
  achievement_key: string | null;
  name: string;
  description: string | null;
  icon_url: string | null;
  badge_color: string | null;
  condition_type: string;
  condition_value: number | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  user_id: string;
  tenant_id: string | null;
  unlocked_at: string;
  created_at: string;
  achievement?: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  percentComplete: number;
}

// ============================================
// ACHIEVEMENT RETRIEVAL
// ============================================

/**
 * Get all achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAllAchievements:', err);
    return [];
  }
}

/**
 * Get achievement by ID
 */
export async function getAchievementById(achievementId: string): Promise<Achievement | null> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single();

    if (error) {
      console.error('Error fetching achievement:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getAchievementById:', err);
    return null;
  }
}

/**
 * Get achievements by condition type
 */
export async function getAchievementsByCondition(conditionType: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('condition_type', conditionType);

    if (error) {
      console.error('Error fetching achievements by condition:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAchievementsByCondition:', err);
    return [];
  }
}

// ============================================
// USER ACHIEVEMENTS
// ============================================

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(
        `
        id,
        achievement_id,
        user_id,
        tenant_id,
        unlocked_at,
        created_at,
        achievements:achievement_id (*)
      `
      )
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return (data || []).map((item) => {
      const achievement = item.achievements as unknown as Achievement | null;

      return {
        id: item.id,
        achievement_id: item.achievement_id,
        user_id: item.user_id,
        tenant_id: item.tenant_id,
        unlocked_at: item.unlocked_at,
        created_at: item.created_at,
        achievement: achievement || undefined,
      };
    });
  } catch (err) {
    console.error('Error in getUserAchievements:', err);
    return [];
  }
}

/**
 * Get count of user's unlocked achievements
 */
export async function getUserAchievementCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error counting user achievements:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in getUserAchievementCount:', err);
    return 0;
  }
}

/**
 * Check if user has unlocked an achievement
 */
export async function hasUserUnlockedAchievement(
  userId: string,
  achievementId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking achievement unlock:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error in hasUserUnlockedAchievement:', err);
    return false;
  }
}

// ============================================
// ACHIEVEMENT UNLOCKING
// ============================================

/**
 * Unlock an achievement for a user
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string,
  tenantId?: string
): Promise<UserAchievement | null> {
  try {
    // Check if already unlocked
    const alreadyUnlocked = await hasUserUnlockedAchievement(userId, achievementId);
    if (alreadyUnlocked) {
      console.log('Achievement already unlocked');
      return null;
    }

    // Unlock achievement
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        achievement_id: achievementId,
        user_id: userId,
        tenant_id: tenantId || null,
        unlocked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }

    return {
      id: data.id,
      achievement_id: data.achievement_id,
      user_id: data.user_id,
      tenant_id: data.tenant_id,
      unlocked_at: data.unlocked_at,
      created_at: data.created_at,
    };
  } catch (err) {
    console.error('Error in unlockAchievement:', err);
    return null;
  }
}

/**
 * Check and auto-unlock achievements based on user stats
 */
export async function checkAndUnlockAchievements(
  userId: string,
  userStats: {
    totalGames?: number;
    totalScore?: number;
    bestScore?: number;
    sessionCount?: number;
  },
  tenantId?: string
): Promise<UserAchievement[]> {
  try {
    const unlockedAchievements: UserAchievement[] = [];

    // Get all achievements
    const allAchievements = await getAllAchievements();

    for (const achievement of allAchievements) {
      // Skip if already unlocked
      const isUnlocked = await hasUserUnlockedAchievement(userId, achievement.id);
      if (isUnlocked) continue;

      let shouldUnlock = false;

      // Check conditions
      switch (achievement.condition_type) {
        case 'session_count':
          if (
            achievement.condition_value &&
            userStats.sessionCount &&
            userStats.sessionCount >= achievement.condition_value
          ) {
            shouldUnlock = true;
          }
          break;

        case 'total_score':
          if (
            achievement.condition_value &&
            userStats.totalScore &&
            userStats.totalScore >= achievement.condition_value
          ) {
            shouldUnlock = true;
          }
          break;

        case 'best_score':
          if (
            achievement.condition_value &&
            userStats.bestScore &&
            userStats.bestScore >= achievement.condition_value
          ) {
            shouldUnlock = true;
          }
          break;

        case 'score_milestone':
          if (
            achievement.condition_value &&
            userStats.bestScore &&
            userStats.bestScore >= achievement.condition_value
          ) {
            shouldUnlock = true;
          }
          break;
      }

      // Unlock if condition met
      if (shouldUnlock) {
        const unlocked = await unlockAchievement(userId, achievement.id, tenantId);
        if (unlocked) {
          unlockedAchievements.push(unlocked);
        }
      }
    }

    return unlockedAchievements;
  } catch (err) {
    console.error('Error in checkAndUnlockAchievements:', err);
    return [];
  }
}

// ============================================
// ACHIEVEMENT PROGRESS
// ============================================

/**
 * Get achievement progress for a user
 */
export async function getUserAchievementProgress(userId: string): Promise<AchievementProgress[]> {
  try {
    const allAchievements = await getAllAchievements();
    const userAchievements = await getUserAchievements(userId);

    // Get user stats from game_sessions
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('score')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const totalGames = sessions?.length || 0;
    const totalScore = sessions?.reduce((sum, s) => sum + (s.score || 0), 0) || 0;
    const bestScore = sessions ? Math.max(...sessions.map((s) => s.score || 0)) : 0;

    return allAchievements.map((achievement) => {
      const isUnlocked = userAchievements.some((ua) => ua.achievement_id === achievement.id);
      const unlockedItem = userAchievements.find((ua) => ua.achievement_id === achievement.id);

      let progress = 0;
      let percentComplete = 0;

      switch (achievement.condition_type) {
        case 'session_count':
          progress = totalGames;
          percentComplete = achievement.condition_value
            ? Math.min(100, (totalGames / achievement.condition_value) * 100)
            : 0;
          break;

        case 'total_score':
          progress = totalScore;
          percentComplete = achievement.condition_value
            ? Math.min(100, (totalScore / achievement.condition_value) * 100)
            : 0;
          break;

        case 'best_score':
        case 'score_milestone':
          progress = bestScore;
          percentComplete = achievement.condition_value
            ? Math.min(100, (bestScore / achievement.condition_value) * 100)
            : 0;
          break;
      }

      return {
        achievement,
        progress,
        isUnlocked,
        unlockedAt: unlockedItem?.unlocked_at || null,
        percentComplete,
      };
    });
  } catch (err) {
    console.error('Error in getUserAchievementProgress:', err);
    return [];
  }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get achievement statistics for a user
 */
export async function getUserAchievementStats(userId: string) {
  try {
    const userAchievements = await getUserAchievements(userId);
    const allAchievements = await getAllAchievements();

    return {
      unlockedCount: userAchievements.length,
      totalCount: allAchievements.length,
      completionPercentage: Math.round(
        (userAchievements.length / Math.max(1, allAchievements.length)) * 100
      ),
      recentlyUnlocked: userAchievements.slice(0, 3),
    };
  } catch (err) {
    console.error('Error in getUserAchievementStats:', err);
    return {
      unlockedCount: 0,
      totalCount: 0,
      completionPercentage: 0,
      recentlyUnlocked: [],
    };
  }
}

/**
 * Get leaderboard by achievement count
 */
export async function getAchievementLeaderboard(
  limit: number = 50
): Promise<{ userId: string; userName: string; achievementCount: number }[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('user_id, users:user_id (full_name)')
      .order('user_id')
      .limit(limit);

    if (error) {
      console.error('Error fetching achievement leaderboard:', error);
      return [];
    }

    // Count achievements per user
    const counts: Record<string, { name: string; count: number }> = {};

    (data || []).forEach((item) => {
      if (!counts[item.user_id]) {
        counts[item.user_id] = {
          name: (item.users as Record<string, unknown>)?.full_name as string || 'Anonymous',
          count: 0,
        };
      }
      counts[item.user_id].count++;
    });

    return Object.entries(counts)
      .map(([userId, { name, count }]) => ({
        userId,
        userName: name,
        achievementCount: count,
      }))
      .sort((a, b) => b.achievementCount - a.achievementCount)
      .slice(0, limit);
  } catch (err) {
    console.error('Error in getAchievementLeaderboard:', err);
    return [];
  }
}

// ============================================
// TENANT-AWARE ACHIEVEMENTS (Phase 3)
// ============================================

/**
 * Get achievements visible to a user within a specific tenant context.
 * Returns:
 * - Global achievements (scope = 'global', tenant_id IS NULL)
 * - Tenant achievements (scope = 'tenant', tenant_id = tenantId, status = 'active')
 */
export async function getAchievementsForTenant(tenantId: string | null): Promise<Achievement[]> {
  try {
    // Build query for global + tenant achievements
    let query = supabase
      .from('achievements')
      .select('*')
      .eq('status', 'active');

    if (tenantId) {
      // Get global OR this tenant's achievements
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    } else {
      // Only global achievements
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tenant achievements:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAchievementsForTenant:', err);
    return [];
  }
}

/**
 * Get user's achievement progress within a tenant context.
 * Shows global achievements plus tenant-specific ones.
 */
export async function getUserAchievementProgressForTenant(
  userId: string,
  tenantId: string | null
): Promise<AchievementProgress[]> {
  try {
    const achievements = await getAchievementsForTenant(tenantId);
    const userAchievements = await getUserAchievements(userId);

    // Get user stats from game_sessions
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('score')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const totalGames = sessions?.length || 0;
    const totalScore = sessions?.reduce((sum, s) => sum + (s.score || 0), 0) || 0;
    const bestScore = sessions ? Math.max(0, ...sessions.map((s) => s.score || 0)) : 0;

    return achievements.map((achievement) => {
      const isUnlocked = userAchievements.some((ua) => ua.achievement_id === achievement.id);
      const unlockedItem = userAchievements.find((ua) => ua.achievement_id === achievement.id);

      let progress = 0;
      let percentComplete = 0;

      switch (achievement.condition_type) {
        case 'session_count':
        case 'games_played':
          progress = totalGames;
          percentComplete = achievement.condition_value
            ? Math.min(100, (totalGames / achievement.condition_value) * 100)
            : 0;
          break;

        case 'total_score':
        case 'score_reached':
          progress = totalScore;
          percentComplete = achievement.condition_value
            ? Math.min(100, (totalScore / achievement.condition_value) * 100)
            : 0;
          break;

        case 'best_score':
        case 'score_milestone':
          progress = bestScore;
          percentComplete = achievement.condition_value
            ? Math.min(100, (bestScore / achievement.condition_value) * 100)
            : 0;
          break;

        case 'first_game':
          percentComplete = totalGames > 0 ? 100 : 0;
          break;

        case 'perfect_score':
        case 'manual':
        default:
          // Manual or unknown - no progress
          percentComplete = isUnlocked ? 100 : 0;
          break;
      }

      return {
        achievement,
        progress,
        isUnlocked,
        unlockedAt: unlockedItem?.unlocked_at || null,
        percentComplete: isUnlocked ? 100 : percentComplete,
      };
    });
  } catch (err) {
    console.error('Error in getUserAchievementProgressForTenant:', err);
    return [];
  }
}

/**
 * Get user's achievement stats within a tenant context.
 */
export async function getUserAchievementStatsForTenant(
  userId: string,
  tenantId: string | null
): Promise<{
  unlockedCount: number;
  totalCount: number;
  completionPercentage: number;
  recentlyUnlocked: UserAchievement[];
}> {
  try {
    const achievements = await getAchievementsForTenant(tenantId);
    const userAchievements = await getUserAchievements(userId);

    // Filter user achievements to only those in the tenant context
    const achievementIds = new Set(achievements.map((a) => a.id));
    const relevantUserAchievements = userAchievements.filter((ua) =>
      achievementIds.has(ua.achievement_id)
    );

    return {
      unlockedCount: relevantUserAchievements.length,
      totalCount: achievements.length,
      completionPercentage: Math.round(
        (relevantUserAchievements.length / Math.max(1, achievements.length)) * 100
      ),
      recentlyUnlocked: relevantUserAchievements.slice(0, 3),
    };
  } catch (err) {
    console.error('Error in getUserAchievementStatsForTenant:', err);
    return {
      unlockedCount: 0,
      totalCount: 0,
      completionPercentage: 0,
      recentlyUnlocked: [],
    };
  }
}
