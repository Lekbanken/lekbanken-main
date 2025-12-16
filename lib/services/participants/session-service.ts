/**
 * Participant Session Management Service
 * 
 * Handles creation, validation, and management of participant sessions.
 * Supports token expiry quotas and session lifecycle.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateUniqueSessionCode } from './session-code-generator';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/supabase';

type ParticipantSession = Database['public']['Tables']['participant_sessions']['Row'];
type ParticipantSessionInsert = Database['public']['Tables']['participant_sessions']['Insert'];
type ParticipantSessionUpdate = Database['public']['Tables']['participant_sessions']['Update'];

/**
 * Session creation options
 */
export interface CreateSessionOptions {
  tenantId: string;
  hostUserId: string;
  displayName: string;
  description?: string;
  planId?: string;
  gameId?: string;
  settings?: {
    allowRejoin?: boolean;
    maxParticipants?: number;
    requireApproval?: boolean;
    allowAnonymous?: boolean;
    tokenExpiryHours?: number | null; // null = no expiry
    enableChat?: boolean;
    enableProgressTracking?: boolean;
  };
  expiresAt?: Date; // When session auto-closes
}

/**
 * Session service class
 */
export class ParticipantSessionService {
  /**
   * Create a new participant session
   */
  static async createSession(options: CreateSessionOptions): Promise<ParticipantSession> {
    const supabase = await createServiceRoleClient();
    
    try {
      // Generate unique session code
      const sessionCode = await generateUniqueSessionCode();
      
      // Check token expiry quota if no-expiry requested
      if (options.settings?.tokenExpiryHours === null) {
        const canUseNoExpiry = await this.checkNoExpiryQuota(
          options.tenantId,
          options.hostUserId
        );
        
        if (!canUseNoExpiry) {
          throw new Error('No-expiry token quota exceeded for this tenant');
        }
      }
      
      // Prepare session data
      const sessionData: ParticipantSessionInsert = {
        tenant_id: options.tenantId,
        host_user_id: options.hostUserId,
        session_code: sessionCode,
        display_name: options.displayName,
        description: options.description,
        plan_id: options.planId,
        game_id: options.gameId,
        expires_at: options.expiresAt?.toISOString(),
        settings: {
          allow_rejoin: options.settings?.allowRejoin ?? true,
          max_participants: options.settings?.maxParticipants ?? 100,
          require_approval: options.settings?.requireApproval ?? false,
          allow_anonymous: options.settings?.allowAnonymous ?? true,
          token_expiry_hours: options.settings?.tokenExpiryHours ?? 24,
          enable_chat: options.settings?.enableChat ?? false,
          enable_progress_tracking: options.settings?.enableProgressTracking ?? true,
        },
      };
      
      // Insert session
      const { data, error } = await supabase
        .from('participant_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) {
        logger.error('Failed to create participant session', error, {
          tenantId: options.tenantId,
          hostUserId: options.hostUserId,
        });
        throw error;
      }
      
      // If no-expiry token used, increment quota
      if (options.settings?.tokenExpiryHours === null) {
        await this.incrementNoExpiryQuota(options.tenantId);
      }
      
      logger.info('Participant session created', {
        sessionId: data.id,
        sessionCode,
        tenantId: options.tenantId,
      });
      
      return data;
    } catch (error) {
      logger.error('Error creating participant session', error as Error, {
        tenantId: options.tenantId,
      });
      throw error;
    }
  }
  
  /**
   * Get session by code
   */
  static async getSessionByCode(sessionCode: string): Promise<ParticipantSession | null> {
    const supabase = await createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('participant_sessions')
      .select('*')
      .eq('session_code', sessionCode.toUpperCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }
    
    return data;
  }
  
  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<ParticipantSession | null> {
    const supabase = await createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('participant_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled'
  ): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    const updateData: ParticipantSessionUpdate = {
      status,
    };
    
    // Set timestamp fields based on status
    if (status === 'paused') {
      updateData.paused_at = new Date().toISOString();
    } else if (status === 'ended' || status === 'cancelled') {
      updateData.ended_at = new Date().toISOString();
    } else if (status === 'archived') {
      updateData.archived_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('participant_sessions')
      .update(updateData)
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to update session status', error, { sessionId, status });
      throw error;
    }
    
    logger.info('Session status updated', { sessionId, status });
  }
  
  /**
   * Check if tenant can use no-expiry tokens
   */
  private static async checkNoExpiryQuota(
    tenantId: string,
    hostUserId: string
  ): Promise<boolean> {
    const supabase = await createServiceRoleClient();
    
    // System admins have unlimited no-expiry tokens
    const { data: hostUser, error: userError } = await supabase
      .from('users')
      .select('global_role')
      .eq('id', hostUserId)
      .single();
    
    if (hostUser?.global_role === 'system_admin') {
      return true; // Unlimited for system admins
    }

    if (userError) {
      logger.warn('Unable to resolve host user for quota check', {
        hostUserId,
        error: userError.message,
      });
    }
    
    // Check tenant quota
    const { data: quota } = await supabase
      .from('participant_token_quotas')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    
    if (!quota) {
      // Create default quota if missing
      await supabase
        .from('participant_token_quotas')
        .insert({ tenant_id: tenantId, no_expiry_tokens_limit: 2 });
      return true; // First usage allowed
    }
    
    return quota.no_expiry_tokens_used < quota.no_expiry_tokens_limit;
  }
  
  /**
   * Increment no-expiry token usage
   */
  private static async incrementNoExpiryQuota(tenantId: string): Promise<void> {
    const supabase = await createServiceRoleClient();

    const { data: quota, error: quotaError } = await supabase
      .from('participant_token_quotas')
      .select('no_expiry_tokens_used, no_expiry_tokens_limit')
      .eq('tenant_id', tenantId)
      .single();

    if (quotaError) {
      logger.error('Failed to fetch quota for increment', quotaError, { tenantId });
      return;
    }

    if (!quota) {
      const { error: createError } = await supabase
        .from('participant_token_quotas')
        .insert({
          tenant_id: tenantId,
          no_expiry_tokens_limit: 2,
          no_expiry_tokens_used: 1,
        });

      if (createError) {
        logger.error('Failed to create quota record when incrementing', createError, {
          tenantId,
        });
      }
      return;
    }

    const { error: updateError } = await supabase
      .from('participant_token_quotas')
      .update({ no_expiry_tokens_used: quota.no_expiry_tokens_used + 1 })
      .eq('tenant_id', tenantId);

    if (updateError) {
      logger.error('Failed to increment no-expiry quota', updateError, { tenantId });
    }
  }
  
  /**
   * Get active sessions for a host
   */
  static async getHostSessions(
    hostUserId: string,
    includeArchived = false
  ): Promise<ParticipantSession[]> {
    const supabase = await createServiceRoleClient();
    
    let query = supabase
      .from('participant_sessions')
      .select('*')
      .eq('host_user_id', hostUserId)
      .order('created_at', { ascending: false });
    
    if (!includeArchived) {
      query = query.neq('status', 'archived');
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Archive old sessions (cleanup job)
   */
  static async archiveOldSessions(daysOld = 30): Promise<number> {
    const supabase = await createServiceRoleClient();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const { data, error } = await supabase
      .from('participant_sessions')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .in('status', ['ended', 'cancelled'])
      .lt('ended_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      logger.error('Failed to archive old sessions', error);
      throw error;
    }
    
    const count = data?.length || 0;
    logger.info(`Archived ${count} old sessions`, { daysOld });
    
    return count;
  }

  // ===========================================================================
  // RUNTIME STATE METHODS (PR1: Legendary Play)
  // NOTE: These methods require migration 20251216160000 to be applied.
  // After applying the migration, regenerate types with: npx supabase gen types typescript
  // The `as any` casts can then be removed and replaced with proper types.
  // ===========================================================================

  /* eslint-disable @typescript-eslint/no-explicit-any */

  /**
   * Update current step index
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async updateCurrentStep(sessionId: string, stepIndex: number): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ current_step_index: stepIndex })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to update current step', error, { sessionId, stepIndex });
      throw error;
    }
    
    // Log event
    await this.logSessionEvent(sessionId, 'step_changed', { step_index: stepIndex });
  }

  /**
   * Update current phase index
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async updateCurrentPhase(sessionId: string, phaseIndex: number): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ current_phase_index: phaseIndex })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to update current phase', error, { sessionId, phaseIndex });
      throw error;
    }
    
    // Log event
    await this.logSessionEvent(sessionId, 'phase_changed', { phase_index: phaseIndex });
  }

  /**
   * Start timer
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async startTimer(sessionId: string, durationSeconds: number): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    const timerState = {
      started_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      paused_at: null,
    };
    
    // Cast to any - new columns added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ timer_state: timerState })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to start timer', error, { sessionId, durationSeconds });
      throw error;
    }
    
    await this.logSessionEvent(sessionId, 'timer_started', { duration_seconds: durationSeconds });
  }

  /**
   * Pause timer
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async pauseTimer(sessionId: string): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { data: session, error: fetchError } = await (supabase as any)
      .from('participant_sessions')
      .select('timer_state')
      .eq('id', sessionId)
      .single();
    
    if (fetchError || !session?.timer_state) {
      throw new Error('No active timer to pause');
    }
    
    const currentState = session.timer_state as { started_at: string; duration_seconds: number; paused_at: string | null };
    if (currentState.paused_at) {
      return; // Already paused
    }
    
    const timerState = {
      ...currentState,
      paused_at: new Date().toISOString(),
    };
    
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ timer_state: timerState })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to pause timer', error, { sessionId });
      throw error;
    }
    
    await this.logSessionEvent(sessionId, 'timer_paused', {});
  }

  /**
   * Resume timer
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async resumeTimer(sessionId: string): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { data: session, error: fetchError } = await (supabase as any)
      .from('participant_sessions')
      .select('timer_state')
      .eq('id', sessionId)
      .single();
    
    if (fetchError || !session?.timer_state) {
      throw new Error('No timer to resume');
    }
    
    const currentState = session.timer_state as { started_at: string; duration_seconds: number; paused_at: string | null };
    if (!currentState.paused_at) {
      return; // Not paused
    }
    
    // Adjust started_at to account for pause duration
    const pauseTime = new Date(currentState.paused_at).getTime();
    const pauseDuration = Date.now() - pauseTime;
    const originalStart = new Date(currentState.started_at).getTime();
    const adjustedStart = new Date(originalStart + pauseDuration);
    
    const timerState = {
      started_at: adjustedStart.toISOString(),
      duration_seconds: currentState.duration_seconds,
      paused_at: null,
    };
    
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ timer_state: timerState })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to resume timer', error, { sessionId });
      throw error;
    }
    
    await this.logSessionEvent(sessionId, 'timer_resumed', {});
  }

  /**
   * Reset/stop timer
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async resetTimer(sessionId: string): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ timer_state: null })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to reset timer', error, { sessionId });
      throw error;
    }
    
    await this.logSessionEvent(sessionId, 'timer_reset', {});
  }

  /**
   * Update board state (message and overrides)
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async updateBoardState(
    sessionId: string, 
    boardState: { message?: string; overrides?: Record<string, boolean> } | null
  ): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new columns added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('participant_sessions')
      .update({ board_state: boardState })
      .eq('id', sessionId);
    
    if (error) {
      logger.error('Failed to update board state', error, { sessionId });
      throw error;
    }
    
    await this.logSessionEvent(sessionId, 'board_message_set', { board_state: boardState });
  }

  /**
   * Snapshot game roles to session (call at session start for participants games)
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async snapshotGameRoles(
    sessionId: string,
    gameId: string,
    locale?: string
  ): Promise<number> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new RPC added in migration 20251216160000
    const { data, error } = await (supabase as any)
      .rpc('snapshot_game_roles_to_session', {
        p_session_id: sessionId,
        p_game_id: gameId,
        p_locale: locale || null,
      });
    
    if (error) {
      logger.error('Failed to snapshot game roles', error, { sessionId, gameId });
      throw error;
    }
    
    const count = (data as number) || 0;
    logger.info(`Snapshotted ${count} roles to session`, { sessionId, gameId });
    
    return count;
  }

  /**
   * Get session roles
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async getSessionRoles(sessionId: string): Promise<unknown[]> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new table added in migration 20251216160000
    const { data, error } = await (supabase as any)
      .from('session_roles')
      .select('*')
      .eq('session_id', sessionId)
      .order('role_order');
    
    if (error) {
      logger.error('Failed to get session roles', error, { sessionId });
      throw error;
    }
    
    return data || [];
  }

  /**
   * Log session event
   * NOTE: Requires migration 20251216160000, regenerate types after applying
   */
  static async logSessionEvent(
    sessionId: string,
    eventType: string,
    eventData: Record<string, unknown>,
    actorUserId?: string,
    actorParticipantId?: string
  ): Promise<void> {
    const supabase = await createServiceRoleClient();
    
    // Cast to any - new table added in migration 20251216160000
    const { error } = await (supabase as any)
      .from('session_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        actor_user_id: actorUserId || null,
        actor_participant_id: actorParticipantId || null,
      });
    
    if (error) {
      // Log but don't throw - event logging should not break main flow
      logger.warn('Failed to log session event', { sessionId, eventType, error: error.message });
    }
  }

  /* eslint-enable @typescript-eslint/no-explicit-any */
}
