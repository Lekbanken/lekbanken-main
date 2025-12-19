/**
 * PATCH /api/play/sessions/[id]/state
 * 
 * Update session runtime state (step, phase, timer, board).
 * Host-only endpoint.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { ParticipantSessionWithRuntime } from '@/types/participant-session-extended';

interface StateUpdateRequest {
  action: 'set_step' | 'set_phase' | 'timer_start' | 'timer_pause' | 'timer_resume' | 'timer_reset' | 'set_board_message';
  step_index?: number;
  phase_index?: number;
  duration_seconds?: number;
  message?: string | null;
  overrides?: Record<string, boolean>;
}

async function broadcastPlayEvent(sessionId: string, event: unknown) {
  try {
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (error) {
    // Best-effort: do not fail the request if realtime broadcast fails.
    console.warn('[play/sessions/[id]/state] Failed to broadcast play event:', error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Verify authentication
    const supabase = await createServerRlsClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get session and verify host
    const session = await ParticipantSessionService.getSessionById(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.host_user_id !== user.id) {
      // Check if global admin via user table
      const { data: userData } = await supabase
        .from('users')
        .select('global_role')
        .eq('id', user.id)
        .single();
        
      if (userData?.global_role !== 'system_admin') {
        return NextResponse.json({ error: 'Not authorized to modify this session' }, { status: 403 });
      }
    }
    
    // Parse request
    const body: StateUpdateRequest = await request.json();

    // Track which broadcast to emit (best-effort)
    let broadcastEvent: unknown | null = null;
    
    switch (body.action) {
      case 'set_step':
        if (typeof body.step_index !== 'number' || body.step_index < 0) {
          return NextResponse.json({ error: 'Invalid step_index' }, { status: 400 });
        }
        await ParticipantSessionService.updateCurrentStep(sessionId, body.step_index);
        broadcastEvent = {
          type: 'state_change',
          payload: { current_step_index: body.step_index },
          timestamp: new Date().toISOString(),
        };
        break;
        
      case 'set_phase':
        if (typeof body.phase_index !== 'number' || body.phase_index < 0) {
          return NextResponse.json({ error: 'Invalid phase_index' }, { status: 400 });
        }
        await ParticipantSessionService.updateCurrentPhase(sessionId, body.phase_index);
        broadcastEvent = {
          type: 'state_change',
          payload: { current_phase_index: body.phase_index },
          timestamp: new Date().toISOString(),
        };
        break;
        
      case 'timer_start':
        if (typeof body.duration_seconds !== 'number' || body.duration_seconds <= 0) {
          return NextResponse.json({ error: 'Invalid duration_seconds' }, { status: 400 });
        }
        await ParticipantSessionService.startTimer(sessionId, body.duration_seconds);
        break;
        
      case 'timer_pause':
        await ParticipantSessionService.pauseTimer(sessionId);
        break;
        
      case 'timer_resume':
        await ParticipantSessionService.resumeTimer(sessionId);
        break;
        
      case 'timer_reset':
        await ParticipantSessionService.resetTimer(sessionId);
        break;
        
      case 'set_board_message':
        await ParticipantSessionService.updateBoardState(sessionId, {
          message: body.message ?? undefined,
          overrides: body.overrides,
        });
        broadcastEvent = {
          type: 'board_update',
          payload: {
            message: body.message ?? undefined,
            overrides: body.overrides,
          },
          timestamp: new Date().toISOString(),
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
    // Return updated session state
    const updatedSession = await ParticipantSessionService.getSessionById(sessionId) as ParticipantSessionWithRuntime | null;

    // Timer broadcasts need the updated timer_state from DB.
    if (
      body.action === 'timer_start' ||
      body.action === 'timer_pause' ||
      body.action === 'timer_resume' ||
      body.action === 'timer_reset'
    ) {
      const actionMap = {
        timer_start: 'start',
        timer_pause: 'pause',
        timer_resume: 'resume',
        timer_reset: 'reset',
      } as const;

      broadcastEvent = {
        type: 'timer_update',
        payload: {
          action: actionMap[body.action],
          timer_state: updatedSession?.timer_state ?? null,
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (broadcastEvent) {
      await broadcastPlayEvent(sessionId, broadcastEvent);
    }
    
    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession?.id,
        current_step_index: updatedSession?.current_step_index ?? 0,
        current_phase_index: updatedSession?.current_phase_index ?? 0,
        timer_state: updatedSession?.timer_state,
        board_state: updatedSession?.board_state,
        status: updatedSession?.status,
      },
    });
    
  } catch (error) {
    console.error('Error updating session state:', error);
    return NextResponse.json(
      { error: 'Failed to update session state' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/play/sessions/[id]/state
 * 
 * Get current session runtime state.
 * Accessible by host and participants (limited view).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    const session = await ParticipantSessionService.getSessionById(sessionId) as ParticipantSessionWithRuntime | null;
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Return public runtime state (no auth required for basic state)
    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        current_step_index: session.current_step_index ?? 0,
        current_phase_index: session.current_phase_index ?? 0,
        timer_state: session.timer_state,
        board_state: session.board_state,
        participant_count: session.participant_count,
      },
    });
    
  } catch (error) {
    console.error('Error getting session state:', error);
    return NextResponse.json(
      { error: 'Failed to get session state' },
      { status: 500 }
    );
  }
}
