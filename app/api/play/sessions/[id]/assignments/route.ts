/**
 * Role Assignments API
 * 
 * POST: Assign roles to participants
 * DELETE: Remove role assignment
 * GET: List assignments for a session
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// POST: Assign roles
// =============================================================================

interface AssignmentRequest {
  assignments: Array<{
    participantId: string;
    roleId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const supabase = await createServerRlsClient();
    
    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is host of this session
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, host_user_id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body: AssignmentRequest = await request.json();
    
    if (!body.assignments || !Array.isArray(body.assignments)) {
      return NextResponse.json(
        { error: 'Invalid request: assignments array required' },
        { status: 400 }
      );
    }
    
    // Validate all role IDs belong to this session
    const roleIds = body.assignments.map((a) => a.roleId);
    const { data: validRoles, error: rolesError } = await supabase
      .from('session_roles')
      .select('id')
      .eq('session_id', sessionId)
      .in('id', roleIds);
    
    if (rolesError) {
      console.error('[Assignments API] Role validation error:', rolesError);
      return NextResponse.json({ error: 'Failed to validate roles' }, { status: 500 });
    }
    
    const validRoleIds = new Set((validRoles || []).map((r) => r.id));
    const invalidRoles = roleIds.filter((id) => !validRoleIds.has(id));
    
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid role IDs: ${invalidRoles.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate all participant IDs belong to this session
    const participantIds = body.assignments.map((a) => a.participantId);
    const { data: validParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', sessionId)
      .in('id', participantIds);
    
    if (participantsError) {
      console.error('[Assignments API] Participant validation error:', participantsError);
      return NextResponse.json({ error: 'Failed to validate participants' }, { status: 500 });
    }
    
    const validParticipantIds = new Set((validParticipants || []).map((p) => p.id));
    const invalidParticipants = participantIds.filter((id) => !validParticipantIds.has(id));
    
    if (invalidParticipants.length > 0) {
      return NextResponse.json(
        { error: `Invalid participant IDs: ${invalidParticipants.join(', ')}` },
        { status: 400 }
      );
    }
    
    // First, delete any existing assignments for these participants
    // (each participant can only have one role in a session)
    const { error: deleteError } = await supabase
      .from('participant_role_assignments')
      .delete()
      .eq('session_id', sessionId)
      .in('participant_id', participantIds);
    
    if (deleteError) {
      console.error('[Assignments API] Delete existing error:', deleteError);
      return NextResponse.json({ error: 'Failed to update assignments' }, { status: 500 });
    }
    
    // Insert new assignments
    const insertData = body.assignments.map((a) => ({
      session_id: sessionId,
      participant_id: a.participantId,
      session_role_id: a.roleId,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    }));
    
    const { data: inserted, error: insertError } = await supabase
      .from('participant_role_assignments')
      .insert(insertData)
      .select();
    
    if (insertError) {
      console.error('[Assignments API] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create assignments' }, { status: 500 });
    }
    
    // Recalculate assigned_count for all roles in this session
    // This ensures counts are accurate after delete + insert
    const { data: allRoles } = await supabase
      .from('session_roles')
      .select('id')
      .eq('session_id', sessionId);
    
    if (allRoles) {
      for (const role of allRoles) {
        const { count } = await supabase
          .from('participant_role_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('session_role_id', role.id);
        
        await supabase
          .from('session_roles')
          .update({ assigned_count: count || 0 })
          .eq('id', role.id);
      }
    }
    
    // Log event
    await supabase
      .from('session_events')
      .insert({
        session_id: sessionId,
        event_type: 'role_assigned',
        event_data: {
          assignments: body.assignments,
          count: body.assignments.length,
        },
        actor_user_id: user.id,
      });
    
    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      assignments: inserted,
    });
  } catch (error) {
    console.error('[Assignments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE: Remove assignment
// =============================================================================

interface UnassignRequest {
  participantId: string;
  roleId: string;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const supabase = await createServerRlsClient();
    
    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is host of this session
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, host_user_id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body: UnassignRequest = await request.json();
    
    if (!body.participantId || !body.roleId) {
      return NextResponse.json(
        { error: 'participantId and roleId required' },
        { status: 400 }
      );
    }
    
    // Delete assignment
    const { error: deleteError } = await supabase
      .from('participant_role_assignments')
      .delete()
      .eq('session_id', sessionId)
      .eq('participant_id', body.participantId)
      .eq('session_role_id', body.roleId);
    
    if (deleteError) {
      console.error('[Assignments API] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
    }
    
    // Update assigned_count on session_role
    const { data: currentRole } = await supabase
      .from('session_roles')
      .select('assigned_count')
      .eq('id', body.roleId)
      .single();
    
    if (currentRole && currentRole.assigned_count > 0) {
      await supabase
        .from('session_roles')
        .update({ assigned_count: currentRole.assigned_count - 1 })
        .eq('id', body.roleId);
    }
    
    // Log event
    await supabase
      .from('session_events')
      .insert({
        session_id: sessionId,
        event_type: 'role_unassigned',
        event_data: {
          action: 'unassign',
          participantId: body.participantId,
          roleId: body.roleId,
        },
        actor_user_id: user.id,
      });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Assignments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// GET: List assignments
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const supabase = await createServerRlsClient();
    
    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is host of this session
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, host_user_id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all assignments for this session
    const { data: assignments, error: assignmentsError } = await supabase
      .from('participant_role_assignments')
      .select(`
        id,
        session_id,
        participant_id,
        session_role_id,
        assigned_at,
        assigned_by,
        revealed_at
      `)
      .eq('session_id', sessionId);
    
    if (assignmentsError) {
      console.error('[Assignments API] Fetch error:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
    
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('[Assignments API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
