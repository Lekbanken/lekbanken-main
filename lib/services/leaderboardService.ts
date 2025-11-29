/**
 * Leaderboard Service
 * 
 * Handles leaderboard queries, rankings, and aggregated score data.
 * Used in the Play Domain to display global and game-specific rankings.
 */

import { supabase } from '@/lib/supabase/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName?: string;
  totalScore: number;
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  lastPlayedAt: string | null;
}

export interface LeaderboardOptions {
  leaderboardType?: 'global' | 'tenant' | 'personal';
  tenantId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// GLOBAL LEADERBOARDS
// ============================================

/**
 * Get global leaderboard (all players, all games)
 */
export async function getGlobalLeaderboard(
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select(
        `
        user_id,
        total_score,
        total_sessions,
        avg_score,
        best_score,
        last_played_at,
        users:user_id (full_name)
      `
      )
      .eq('leaderboard_type', 'global')
      .is('game_id', null)
      .order('total_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching global leaderboard:', error);
      return [];
    }

    if (!data) return [];

    return data.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.user_id || '',
      userName: (entry.users as Record<string, unknown>)?.full_name as string || 'Anonymous',
      totalScore: entry.total_score || 0,
      totalSessions: entry.total_sessions || 0,
      averageScore: parseFloat(String(entry.avg_score || 0)),
      bestScore: entry.best_score || 0,
      lastPlayedAt: entry.last_played_at,
    }));
  } catch (err) {
    console.error('Error in getGlobalLeaderboard:', err);
    return [];
  }
}

/**
 * Get game-specific leaderboard
 */
export async function getGameLeaderboard(
  gameId: string,
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select(
        `
        user_id,
        total_score,
        total_sessions,
        avg_score,
        best_score,
        last_played_at,
        users:user_id (full_name)
      `
      )
      .eq('game_id', gameId)
      .eq('leaderboard_type', 'global')
      .order('total_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching game leaderboard:', error);
      return [];
    }

    if (!data) return [];

    return data.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.user_id || '',
      userName: (entry.users as Record<string, unknown>)?.full_name as string || 'Anonymous',
      totalScore: entry.total_score || 0,
      totalSessions: entry.total_sessions || 0,
      averageScore: parseFloat(String(entry.avg_score || 0)),
      bestScore: entry.best_score || 0,
      lastPlayedAt: entry.last_played_at,
    }));
  } catch (err) {
    console.error('Error in getGameLeaderboard:', err);
    return [];
  }
}

/**
 * Get tenant leaderboard
 */
export async function getTenantLeaderboard(
  tenantId: string,
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select(
        `
        user_id,
        total_score,
        total_sessions,
        avg_score,
        best_score,
        last_played_at,
        users:user_id (full_name)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('leaderboard_type', 'tenant')
      .order('total_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching tenant leaderboard:', error);
      return [];
    }

    if (!data) return [];

    return data.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.user_id || '',
      userName: (entry.users as Record<string, unknown>)?.full_name as string || 'Anonymous',
      totalScore: entry.total_score || 0,
      totalSessions: entry.total_sessions || 0,
      averageScore: parseFloat(String(entry.avg_score || 0)),
      bestScore: entry.best_score || 0,
      lastPlayedAt: entry.last_played_at,
    }));
  } catch (err) {
    console.error('Error in getTenantLeaderboard:', err);
    return [];
  }
}

/**
 * Get user's rank in global leaderboard
 */
export async function getUserGlobalRank(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('total_score')
      .eq('user_id', userId)
      .eq('leaderboard_type', 'global')
      .is('game_id', null)
      .single();

    if (error || !data) {
      console.error('Error fetching user global rank:', error);
      return null;
    }

    const { count } = await supabase
      .from('leaderboards')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_type', 'global')
      .is('game_id', null)
      .gt('total_score', data.total_score || 0);

    return (count || 0) + 1;
  } catch (err) {
    console.error('Error in getUserGlobalRank:', err);
    return null;
  }
}

/**
 * Get user's rank for a specific game
 */
export async function getUserGameRank(userId: string, gameId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('total_score')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (error || !data) {
      console.error('Error fetching user game rank:', error);
      return null;
    }

    const { count } = await supabase
      .from('leaderboards')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .gt('total_score', data.total_score || 0);

    return (count || 0) + 1;
  } catch (err) {
    console.error('Error in getUserGameRank:', err);
    return null;
  }
}

/**
 * Get user's rank in tenant leaderboard
 */
export async function getUserTenantRank(userId: string, tenantId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('total_score')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('leaderboard_type', 'tenant')
      .single();

    if (error || !data) {
      console.error('Error fetching user tenant rank:', error);
      return null;
    }

    const { count } = await supabase
      .from('leaderboards')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('leaderboard_type', 'tenant')
      .gt('total_score', data.total_score || 0);

    return (count || 0) + 1;
  } catch (err) {
    console.error('Error in getUserTenantRank:', err);
    return null;
  }
}

// ============================================
// USER LEADERBOARD DATA
// ============================================

/**
 * Get user's stats across all games
 */
export async function getUserGlobalStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('total_score, total_sessions, avg_score, best_score')
      .eq('user_id', userId)
      .eq('leaderboard_type', 'global')
      .is('game_id', null)
      .single();

    if (error || !data) {
      return {
        totalScore: 0,
        totalSessions: 0,
        averageScore: 0,
        bestScore: 0,
        rank: null,
      };
    }

    const rank = await getUserGlobalRank(userId);

    return {
      totalScore: data.total_score || 0,
      totalSessions: data.total_sessions || 0,
      averageScore: parseFloat(String(data.avg_score || 0)),
      bestScore: data.best_score || 0,
      rank,
    };
  } catch (err) {
    console.error('Error in getUserGlobalStats:', err);
    return {
      totalScore: 0,
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      rank: null,
    };
  }
}

/**
 * Get user's stats for a specific game
 */
export async function getUserGameStats(userId: string, gameId: string) {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select('total_score, total_sessions, avg_score, best_score')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (error || !data) {
      return {
        totalScore: 0,
        totalSessions: 0,
        averageScore: 0,
        bestScore: 0,
        rank: null,
      };
    }

    const rank = await getUserGameRank(userId, gameId);

    return {
      totalScore: data.total_score || 0,
      totalSessions: data.total_sessions || 0,
      averageScore: parseFloat(String(data.avg_score || 0)),
      bestScore: data.best_score || 0,
      rank,
    };
  } catch (err) {
    console.error('Error in getUserGameStats:', err);
    return {
      totalScore: 0,
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      rank: null,
    };
  }
}

// ============================================
// TOP PERFORMERS
// ============================================

/**
 * Get top performers for all games
 */
export async function getTopPlayers(limit: number = 10): Promise<LeaderboardEntry[]> {
  return getGlobalLeaderboard(limit, 0);
}

/**
 * Get top performers for a specific game
 */
export async function getTopGamePlayers(gameId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  return getGameLeaderboard(gameId, limit, 0);
}

/**
 * Get top performers in a tenant
 */
export async function getTopTenantPlayers(tenantId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  return getTenantLeaderboard(tenantId, limit, 0);
}
