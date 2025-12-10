/**
 * useParticipants Hook
 * 
 * Real-time participant list with Supabase subscriptions.
 * Provides list of participants, join/leave events, and actions (kick, block, assign role).
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

// Temporary types until migration is run and types regenerated
type ParticipantRole = 'observer' | 'player' | 'team_lead' | 'facilitator';
type ParticipantStatus = 'active' | 'idle' | 'disconnected' | 'kicked' | 'blocked';

interface Participant {
  id: string;
  session_id: string;
  display_name: string;
  participant_token: string;
  avatar_url: string | null;
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at: string;
  last_seen_at: string;
  disconnected_at: string | null;
  token_expires_at: string | null;
  progress: Record<string, unknown>;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

interface UseParticipantsOptions {
  sessionId: string;
  enableRealtime?: boolean;
}

interface UseParticipantsReturn {
  participants: Participant[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  kickParticipant: (participantId: string) => Promise<void>;
  blockParticipant: (participantId: string) => Promise<void>;
  updateParticipantRole: (participantId: string, role: ParticipantRole) => Promise<void>;
}

export function useParticipants({ 
  sessionId, 
  enableRealtime = true 
}: UseParticipantsOptions): UseParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = createBrowserClient();
  
  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setParticipants(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, supabase]);
  
  // Initial fetch
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);
  
  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;
    
    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newParticipant = payload.new as Participant;
          setParticipants((prev) => [...prev, newParticipant]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedParticipant = payload.new as Participant;
          setParticipants((prev) =>
            prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const deletedParticipant = payload.old as Participant;
          setParticipants((prev) => prev.filter((p) => p.id !== deletedParticipant.id));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, enableRealtime, supabase]);
  
  // Kick participant
  const kickParticipant = useCallback(async (participantId: string) => {
    try {
      const { error: kickError } = await supabase
        .from('participants')
        .update({ 
          status: 'kicked' as ParticipantStatus,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', participantId);
      
      if (kickError) throw kickError;
      
      // Log activity
      await supabase
        .from('participant_activity_log')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          event_type: 'kick',
        });
    } catch (err) {
      console.error('Failed to kick participant:', err);
      throw err;
    }
  }, [sessionId, supabase]);
  
  // Block participant
  const blockParticipant = useCallback(async (participantId: string) => {
    try {
      const { error: blockError } = await supabase
        .from('participants')
        .update({ 
          status: 'blocked' as ParticipantStatus,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', participantId);
      
      if (blockError) throw blockError;
      
      // Log activity
      await supabase
        .from('participant_activity_log')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          event_type: 'block',
        });
    } catch (err) {
      console.error('Failed to block participant:', err);
      throw err;
    }
  }, [sessionId, supabase]);
  
  // Update participant role
  const updateParticipantRole = useCallback(async (
    participantId: string,
    role: ParticipantRole
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ role })
        .eq('id', participantId);
      
      if (updateError) throw updateError;
      
      // Log activity
      await supabase
        .from('participant_activity_log')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          event_type: 'role_change',
          event_data: { new_role: role },
        });
    } catch (err) {
      console.error('Failed to update participant role:', err);
      throw err;
    }
  }, [sessionId, supabase]);
  
  return {
    participants,
    loading,
    error,
    refetch: fetchParticipants,
    kickParticipant,
    blockParticipant,
    updateParticipantRole,
  };
}
