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
}
