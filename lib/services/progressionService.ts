/**
 * Progression Service
 * 
 * Handles user progression, levels, and streaks.
 * Tracks user advancement and engagement patterns.
 */

import { supabase } from '@/lib/supabase/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UserLevel {
  level: number;
  currentXP: number;
  xpNeeded: number;
  xpPercentage: number;
  totalXP: number;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string | null;
  isStreakActive: boolean;
}

export interface UserProgression {
  level: UserLevel;
  streak: UserStreak;
  totalGamesPlayed: number;
  totalTimeSpent: number;
  lastPlayedAt: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const XP_PER_LEVEL = 1000;
const POINTS_TO_XP = 0.1; // 1 point = 0.1 XP
const STREAK_RESET_HOURS = 48; // Streak resets if no play in 48 hours

// ============================================
// LEVEL CALCULATION
// ============================================

/**
 * Calculate XP requirement for a level
 */
export function calculateXpForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

/**
 * Calculate level from total XP
 */
export function calculateLevelFromXP(totalXP: number): { level: number; currentXP: number } {
  let level = 1;
  let xpUsed = 0;

  while (true) {
    const xpForNextLevel = calculateXpForLevel(level);
    if (xpUsed + xpForNextLevel > totalXP) {
      break;
    }
    xpUsed += xpForNextLevel;
    level++;
  }

  return {
    level,
    currentXP: totalXP - xpUsed,
  };
}

/**
 * Get user's level info
 */
export async function getUserLevel(userId: string): Promise<UserLevel> {
  try {
    // Get user's total score from sessions
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('score')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching sessions for level:', error);
      return {
        level: 1,
        currentXP: 0,
        xpNeeded: XP_PER_LEVEL,
        xpPercentage: 0,
        totalXP: 0,
      };
    }

    const totalScore = (sessions || []).reduce((sum, s) => sum + (s.score || 0), 0);
    const totalXP = Math.floor(totalScore * POINTS_TO_XP);

    const { level, currentXP } = calculateLevelFromXP(totalXP);
    const xpNeeded = calculateXpForLevel(level);
    const xpPercentage = (currentXP / xpNeeded) * 100;

    return {
      level,
      currentXP,
      xpNeeded,
      xpPercentage,
      totalXP,
    };
  } catch (err) {
    console.error('Error in getUserLevel:', err);
    return {
      level: 1,
      currentXP: 0,
      xpNeeded: XP_PER_LEVEL,
      xpPercentage: 0,
      totalXP: 0,
    };
  }
}

// ============================================
// STREAK TRACKING
// ============================================

/**
 * Get user's streak information
 */
export async function getUserStreak(userId: string): Promise<UserStreak> {
  try {
    // Get last 2 play sessions
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !sessions || sessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayDate: null,
        isStreakActive: false,
      };
    }

    const lastPlayDate = sessions[0].created_at;
    const lastPlayDateTime = new Date(lastPlayDate).getTime();
    const nowTime = new Date().getTime();
    const hoursSinceLastPlay = (nowTime - lastPlayDateTime) / (1000 * 60 * 60);

    // Check if streak is still active
    const isStreakActive = hoursSinceLastPlay < STREAK_RESET_HOURS;

    // Group sessions by date to count unique days
    const sessionDates = new Set<string>();
    let currentStreak = 0;
    let longestStreak = 0;

    sessions.forEach((session) => {
      const date = new Date(session.created_at).toDateString();
      sessionDates.add(date);
    });

    // Simple streak calculation - count consecutive days (simplified for MVP)
    // In production, this would need more sophisticated logic
    const uniqueDays = Array.from(sessionDates).length;
    currentStreak = isStreakActive ? uniqueDays : 0;
    longestStreak = uniqueDays;

    return {
      currentStreak,
      longestStreak,
      lastPlayDate,
      isStreakActive,
    };
  } catch (err) {
    console.error('Error in getUserStreak:', err);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastPlayDate: null,
      isStreakActive: false,
    };
  }
}

// ============================================
// OVERALL PROGRESSION
// ============================================

/**
 * Get complete user progression info
 */
export async function getUserProgression(userId: string): Promise<UserProgression> {
  try {
    const [level, streak] = await Promise.all([getUserLevel(userId), getUserStreak(userId)]);

    // Get session stats
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('created_at, duration_seconds')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching sessions for progression:', error);
      return {
        level,
        streak,
        totalGamesPlayed: 0,
        totalTimeSpent: 0,
        lastPlayedAt: null,
      };
    }

    const totalGamesPlayed = sessions?.length || 0;
    const totalTimeSpent = (sessions || []).reduce(
      (sum, s) => sum + (s.duration_seconds || 0),
      0
    );
    const lastPlayedAt = sessions && sessions.length > 0 ? sessions[0].created_at : null;

    return {
      level,
      streak,
      totalGamesPlayed,
      totalTimeSpent,
      lastPlayedAt,
    };
  } catch (err) {
    console.error('Error in getUserProgression:', err);
    return {
      level: {
        level: 1,
        currentXP: 0,
        xpNeeded: XP_PER_LEVEL,
        xpPercentage: 0,
        totalXP: 0,
      },
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayDate: null,
        isStreakActive: false,
      },
      totalGamesPlayed: 0,
      totalTimeSpent: 0,
      lastPlayedAt: null,
    };
  }
}

// ============================================
// MILESTONES
// ============================================

/**
 * Get user's progression milestones
 */
export async function getUserMilestones(userId: string) {
  try {
    const progression = await getUserProgression(userId);

    const milestones = [];

    // Level milestones
    if (progression.level.level >= 5) {
      milestones.push({
        type: 'level',
        milestone: 5,
        achieved: true,
        description: 'Reached Level 5',
      });
    }
    if (progression.level.level >= 10) {
      milestones.push({
        type: 'level',
        milestone: 10,
        achieved: true,
        description: 'Reached Level 10',
      });
    }
    if (progression.level.level >= 25) {
      milestones.push({
        type: 'level',
        milestone: 25,
        achieved: true,
        description: 'Reached Level 25 - Gaming Master!',
      });
    }

    // Streak milestones
    if (progression.streak.longestStreak >= 7) {
      milestones.push({
        type: 'streak',
        milestone: 7,
        achieved: true,
        description: 'Week Warrior - 7 Day Streak',
      });
    }
    if (progression.streak.longestStreak >= 30) {
      milestones.push({
        type: 'streak',
        milestone: 30,
        achieved: true,
        description: 'Month Master - 30 Day Streak',
      });
    }

    // Games played milestones
    if (progression.totalGamesPlayed >= 10) {
      milestones.push({
        type: 'games',
        milestone: 10,
        achieved: true,
        description: 'Played 10 Games',
      });
    }
    if (progression.totalGamesPlayed >= 50) {
      milestones.push({
        type: 'games',
        milestone: 50,
        achieved: true,
        description: 'Played 50 Games - Game Addict!',
      });
    }
    if (progression.totalGamesPlayed >= 100) {
      milestones.push({
        type: 'games',
        milestone: 100,
        achieved: true,
        description: 'Played 100 Games - Legendary Player!',
      });
    }

    return milestones;
  } catch (err) {
    console.error('Error in getUserMilestones:', err);
    return [];
  }
}

// ============================================
// PROGRESSION LEADERBOARD
// ============================================

/**
 * Get leaderboard by user level
 */
export async function getLevelLeaderboard(limit: number = 50) {
  try {
    // Get all users with game sessions
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('user_id, score, users:user_id (full_name)')
      .eq('status', 'completed')
      .order('user_id');

    if (error) {
      console.error('Error fetching level leaderboard:', error);
      return [];
    }

    // Group by user and calculate levels
    const userLevels: Record<
      string,
      { userName: string; totalScore: number; level: number }
    > = {};

    (sessions || []).forEach((session) => {
      if (!userLevels[session.user_id]) {
        userLevels[session.user_id] = {
          userName: (session.users as Record<string, unknown>)?.full_name as string || 'Anonymous',
          totalScore: 0,
          level: 1,
        };
      }
      userLevels[session.user_id].totalScore += session.score || 0;
    });

    // Calculate levels
    Object.entries(userLevels).forEach(([, user]) => {
      const totalXP = Math.floor(user.totalScore * POINTS_TO_XP);
      user.level = calculateLevelFromXP(totalXP).level;
    });

    return Object.entries(userLevels)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        level: data.level,
        totalScore: data.totalScore,
      }))
      .sort((a, b) => b.level - a.level || b.totalScore - a.totalScore)
      .slice(0, limit);
  } catch (err) {
    console.error('Error in getLevelLeaderboard:', err);
    return [];
  }
}
