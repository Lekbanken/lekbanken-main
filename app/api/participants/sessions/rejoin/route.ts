/**
 * Rejoin Session API
 * 
 * POST /api/participants/sessions/rejoin
 * 
 * Validates stored token and restores participant state.
 * Allows participants to reconnect after disconnect/refresh.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';
import type { Database } from '@/types/supabase';

interface RejoinRequest {
  participantToken: string;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Use service role client for token validation (bypass RLS)
    const supabase = await createServiceRoleClient();
    
    const body = await request.json() as RejoinRequest;
    const { participantToken, sessionId } = body;
    
    // Validate input
    if (!participantToken || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: participantToken, sessionId' },
        { status: 400 }
      );
    }
    
    // Find participant by token
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select(`
        *,
        session:participant_sessions!inner(
          id,
          session_code,
          display_name,
          status,
          host_user_id,
          expires_at,
          settings
        )
      `)
      .eq('participant_token', participantToken)
      .eq('session_id', sessionId)
      .single();
    
    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Invalid token or session' },
        { status: 404 }
      );
    }
    
    // Check if participant is blocked or kicked
    if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
      return NextResponse.json(
        { error: 'You have been removed from this session' },
        { status: 403 }
      );
    }
    
    // Check if session has ended
    const session = Array.isArray(participant.session) 
      ? participant.session[0] 
      : participant.session;
      
    if (session.status === 'ended' || session.status === 'cancelled' || session.status === 'archived') {
      return NextResponse.json(
        { error: 'This session has ended' },
        { status: 410 }
      );
    }
    
    // Check if token has expired
    if (participant.token_expires_at) {
      const expiresAt = new Date(participant.token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Your token has expired. Please rejoin with a new code.' },
          { status: 401 }
        );
      }
    }
    
    const requireApproval = Boolean(
      (session.settings as { require_approval?: boolean; requireApproval?: boolean } | null)?.require_approval ??
      (session.settings as { require_approval?: boolean; requireApproval?: boolean } | null)?.requireApproval
    );

    const shouldActivate = !requireApproval && participant.status !== 'idle';

    if (shouldActivate) {
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          status: 'active',
          last_seen_at: new Date().toISOString(),
          disconnected_at: null,
        })
        .eq('id', participant.id);
      
      if (updateError) {
        console.error('[Rejoin] Failed to restore participant:', updateError);
        return NextResponse.json(
          { error: 'Failed to restore session' },
          { status: 500 }
        );
      }
    }
    
    // Log rejoin activity
    await supabase
      .from('participant_activity_log')
      .insert({
        session_id: sessionId,
        participant_id: participant.id,
        event_type: 'rejoin',
        event_data: {
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    
    // Return participant data
    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        displayName: participant.display_name,
        role: participant.role,
        status: shouldActivate ? 'active' : participant.status,
        joinedAt: participant.joined_at,
        progress: participant.progress,
        token: participantToken,
      },
      session: {
        id: session.id,
        sessionCode: session.session_code,
        displayName: session.display_name,
        status: session.status,
        settings: session.settings,
      },
    });
    
  } catch (error) {
    console.error('[Rejoin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
