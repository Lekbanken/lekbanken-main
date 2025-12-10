/**
 * Session Control API
 * 
 * PATCH /api/participants/sessions/[sessionId]/control
 * 
 * Host controls for managing session state:
 * - pause: Temporarily pause session (no new activity)
 * - resume: Resume paused session
 * - lock: Prevent new participants from joining
 * - unlock: Allow new participants again
 * - end: End session gracefully
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type SessionStatus = Database['public']['Enums']['participant_session_status'];

interface ControlRequest {
  action: 'pause' | 'resume' | 'lock' | 'unlock' | 'end';
  reason?: string; // Optional reason for logging
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  
  try {
    const supabase = await createServerRlsClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json() as ControlRequest;
    const { action, reason } = body;
    
    // Validate action
    const validActions = ['pause', 'resume', 'lock', 'unlock', 'end'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: pause, resume, lock, unlock, or end' },
        { status: 400 }
      );
    }
    
    // Verify session exists and user is the host
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, host_user_id, status, session_code, display_name, participant_count')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    if (session.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the session host can control this session' },
        { status: 403 }
      );
    }
    
    // Determine new status based on action
    let newStatus: SessionStatus;
    let broadcastEventType: string;
    
    switch (action) {
      case 'pause':
        if (session.status === 'paused') {
          return NextResponse.json({ error: 'Session is already paused' }, { status: 400 });
        }
        newStatus = 'paused';
        broadcastEventType = 'session_paused';
        break;
        
      case 'resume':
        if (session.status !== 'paused') {
          return NextResponse.json({ error: 'Session is not paused' }, { status: 400 });
        }
        newStatus = 'active';
        broadcastEventType = 'session_resumed';
        break;
        
      case 'lock':
        if (session.status === 'locked') {
          return NextResponse.json({ error: 'Session is already locked' }, { status: 400 });
        }
        newStatus = 'locked';
        broadcastEventType = 'session_locked';
        break;
        
      case 'unlock':
        if (session.status !== 'locked') {
          return NextResponse.json({ error: 'Session is not locked' }, { status: 400 });
        }
        newStatus = 'active';
        broadcastEventType = 'session_unlocked';
        break;
        
      case 'end':
        if (session.status === 'ended') {
          return NextResponse.json({ error: 'Session is already ended' }, { status: 400 });
        }
        newStatus = 'ended';
        broadcastEventType = 'session_ended';
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Update session status
    const { error: updateError } = await supabase
      .from('participant_sessions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error('[SessionControl] Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }
    
    // If ending session, disconnect all participants
    if (action === 'end') {
      const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey);
      
      await supabaseService
        .from('participants')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .in('status', ['active', 'idle']);
    }
    
    // Log the activity
    await supabase
      .from('participant_activity_log')
      .insert({
        session_id: sessionId,
        participant_id: null, // Host action, not participant-specific
        event_type: `session_${action}`,
        event_data: {
          performed_by: user.id,
          reason: reason || null,
          old_status: session.status,
          new_status: newStatus,
        },
      });
    
    // Broadcast to all participants
    const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey);
    const channel = supabaseService.channel(`session:${sessionId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'participant_event',
      payload: {
        type: broadcastEventType,
        payload: {
          sessionId,
          action,
          reason: reason || null,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    });
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: newStatus,
        sessionCode: session.session_code,
        displayName: session.display_name,
        participantCount: session.participant_count,
      },
      message: `Session ${action}d successfully`,
    });
    
  } catch (error) {
    console.error('[SessionControl] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
