/**
 * Game Session Service
 * 
 * Handles all game session management, score tracking, and leaderboard updates.
 * Used in the Play Domain for game execution and scoring.
 */

import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/types/supabase';

export type GameSession = Tables<'game_sessions'>;
export type GameScore = Tables<'game_scores'>;

// ============================================
// TYPES & INTERFACES
// ============================================

export interface SessionStartParams {
  gameId: string;
  userId: string;
  tenantId?: string;
}

export interface ScoreUpdateParams {
  sessionId: string;
  gameId: string;
  userId: string;
  score: number;
  scoreType?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
}

export interface SessionEndParams {
  sessionId: string;
  finalScore: number;
}

export interface GameSessionWithScores extends GameSession {
  scores: GameScore[];
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Start a new game session
 * Creates a game_sessions record and initializes it as active
 */
export async function startGameSession(params: SessionStartParams): Promise<GameSession | null> {
  try {
    const { gameId, userId, tenantId } = params;

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        game_id: gameId,
        user_id: userId,
        tenant_id: tenantId || null,
        status: 'active',
        score: 0,
        duration_seconds: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting game session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in startGameSession:', err);
    return null;
  }
}

/**
 * Get active session for a user and game
 */
export async function getActiveSession(
  gameId: string,
  userId: string
): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error)
      console.error('Error fetching active session:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('Error in getActiveSession:', err);
    return null;
  }
}

/**
 * Get session by ID with all scores
 */
export async function getSessionById(sessionId: string): Promise<GameSessionWithScores | null> {
  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return null;
    }

    const { data: scores, error: scoresError } = await supabase
      .from('game_scores')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true });

    if (scoresError) {
      console.error('Error fetching scores:', scoresError);
      return null;
    }

    return {
      ...sessionData,
      scores: scores || [],
    };
  } catch (err) {
    console.error('Error in getSessionById:', err);
    return null;
  }
}

/**
 * Get user's game sessions with pagination
 */
export async function getUserSessions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ sessions: GameSession[]; total: number } | null> {
  try {
    // Get total count
    const { count } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get paginated sessions
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user sessions:', error);
      return null;
    }

    return {
      sessions: data || [],
      total: count || 0,
    };
  } catch (err) {
    console.error('Error in getUserSessions:', err);
    return null;
  }
}

/**
 * Get user's completed sessions for a specific game
 */
export async function getUserGameSessions(
  userId: string,
  gameId: string,
  limit: number = 10
): Promise<GameSession[]> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user game sessions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserGameSessions:', err);
    return [];
  }
}

// ============================================
// SCORE MANAGEMENT
// ============================================

/**
 * Record a score event during an active session
 */
export async function recordScore(params: ScoreUpdateParams): Promise<GameScore | null> {
  try {
    const {
      sessionId,
      gameId,
      userId,
      score,
      scoreType = 'points',
      metadata,
      tenantId,
    } = params;

    // Record the individual score event
    const { data: scoreData, error: scoreError } = await supabase
      .from('game_scores')
      .insert({
        session_id: sessionId,
        game_id: gameId,
        user_id: userId,
        tenant_id: tenantId || null,
        score: score,
        score_type: scoreType,
        metadata: metadata || {},
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scoreError) {
      console.error('Error recording score:', scoreError);
      return null;
    }

    // Update session total score
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('score')
      .eq('id', sessionId)
      .single();

    if (sessionData) {
      const newScore = (sessionData.score || 0) + score;
      await supabase
        .from('game_sessions')
        .update({ score: newScore })
        .eq('id', sessionId);
    }

    return scoreData;
  } catch (err) {
    console.error('Error in recordScore:', err);
    return null;
  }
}

/**
 * Get all scores for a session
 */
export async function getSessionScores(sessionId: string): Promise<GameScore[]> {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Error fetching session scores:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getSessionScores:', err);
    return [];
  }
}

// ============================================
// SESSION COMPLETION
// ============================================

/**
 * End an active session
 */
export async function endGameSession(params: SessionEndParams): Promise<GameSession | null> {
  try {
    const { sessionId, finalScore } = params;

    // Calculate duration
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    const durationSeconds = sessionData
      ? Math.floor(
          (new Date().getTime() - new Date(sessionData.started_at).getTime()) / 1000
        )
      : 0;

    // Update session to completed
    const { data, error } = await supabase
      .from('game_sessions')
      .update({
        status: 'completed',
        score: finalScore,
        duration_seconds: durationSeconds,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error ending game session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in endGameSession:', err);
    return null;
  }
}

/**
 * Pause a session
 */
export async function pauseGameSession(sessionId: string): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error pausing session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in pauseGameSession:', err);
    return null;
  }
}

/**
 * Resume a paused session
 */
export async function resumeGameSession(sessionId: string): Promise<GameSession | null> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error resuming session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in resumeGameSession:', err);
    return null;
  }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get user's game statistics
 */
export async function getUserGameStats(userId: string, gameId: string) {
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('score, duration_seconds')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('status', 'completed');

    if (sessionsError || !sessions || sessions.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSeconds: 0,
      };
    }

    const totalGames = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const averageScore = totalScore / totalGames;
    const bestScore = Math.max(...sessions.map((s) => s.score || 0));
    const totalTimeSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

    return {
      totalGames,
      totalScore,
      averageScore: Math.round(averageScore),
      bestScore,
      totalTimeSeconds,
    };
  } catch (err) {
    console.error('Error in getUserGameStats:', err);
    return {
      totalGames: 0,
      totalScore: 0,
      averageScore: 0,
      bestScore: 0,
      totalTimeSeconds: 0,
    };
  }
}
