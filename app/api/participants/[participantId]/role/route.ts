/**
 * Update Participant Role API
 * 
 * POST /api/participants/[participantId]/role
 * 
 * Allows host to change a participant's role and broadcasts the change.
 * Requires authentication (host only).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type ParticipantRole = Database['public']['Enums']['participant_role'];

interface UpdateRoleRequest {
  role: ParticipantRole;
  sessionId: string; // For verification that host owns this session
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await context.params;
  
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
    
    const body = await request.json() as UpdateRoleRequest;
    const { role, sessionId } = body;
    
    // Validate role
    const validRoles: ParticipantRole[] = ['observer', 'player', 'team_lead', 'facilitator'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: observer, player, team_lead, facilitator' },
        { status: 400 }
      );
    }
    
    // Verify the session exists and user is the host
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, host_user_id, session_code')
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
        { error: 'Only the session host can change participant roles' },
        { status: 403 }
      );
    }
    
    // Verify participant exists and belongs to this session
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, display_name, role, session_id')
      .eq('id', participantId)
      .single();
    
    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }
    
    if (participant.session_id !== sessionId) {
      return NextResponse.json(
        { error: 'Participant does not belong to this session' },
        { status: 400 }
      );
    }
    
    // Update participant role
    const { data: updatedParticipant, error: updateError } = await supabase
      .from('participants')
      .update({ role })
      .eq('id', participantId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[UpdateRole] Failed to update role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }
    
    // Log the activity
    await supabase
      .from('participant_activity_log')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        event_type: 'role_changed',
        event_data: {
          old_role: participant.role,
          new_role: role,
          changed_by: user.id,
        },
      });
    
    // Broadcast role change to all participants via Supabase Realtime
    // The broadcast happens through the participants table update (realtime subscription)
    // Additionally send explicit broadcast for immediate UI update
    const channel = supabase.channel(`session:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'participant_event',
      payload: {
        type: 'role_changed',
        payload: {
          participantId,
          displayName: participant.display_name,
          oldRole: participant.role,
          newRole: role,
        },
        timestamp: new Date().toISOString(),
      },
    });
    
    return NextResponse.json({
      success: true,
      participant: updatedParticipant,
      message: `${participant.display_name}'s role changed from ${participant.role} to ${role}`,
    });
    
  } catch (error) {
    console.error('[UpdateRole] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
