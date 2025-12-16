/**
 * Session Roles API
 * 
 * GET /api/play/sessions/[id]/roles - List session roles
 * POST /api/play/sessions/[id]/roles - Snapshot roles from game (host only)
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

/**
 * GET - List session roles
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    const session = await ParticipantSessionService.getSessionById(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const roles = await ParticipantSessionService.getSessionRoles(sessionId);
    
    // Check if requester is host (for full role info) or participant (limited info)
    const supabase = await createServerRlsClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const isHost = user?.id === session.host_user_id;
    
    if (isHost) {
      // Host sees everything
      return NextResponse.json({ roles });
    }
    
    // Participants see only public info
    const publicRoles = (roles as Array<Record<string, unknown>>).map(role => ({
      id: role.id,
      name: role.name,
      icon: role.icon,
      color: role.color,
      role_order: role.role_order,
      public_description: role.public_description,
      assigned_count: role.assigned_count,
      // Private fields omitted
    }));
    
    return NextResponse.json({ roles: publicRoles });
    
  } catch (error) {
    console.error('Error getting session roles:', error);
    return NextResponse.json(
      { error: 'Failed to get session roles' },
      { status: 500 }
    );
  }
}

/**
 * POST - Snapshot roles from game to session
 */
export async function POST(
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
      return NextResponse.json({ error: 'Only host can snapshot roles' }, { status: 403 });
    }
    
    if (!session.game_id) {
      return NextResponse.json({ error: 'Session has no associated game' }, { status: 400 });
    }
    
    // Check if roles already snapshotted
    const existingRoles = await ParticipantSessionService.getSessionRoles(sessionId);
    if (existingRoles.length > 0) {
      return NextResponse.json(
        { error: 'Roles already snapshotted for this session', count: existingRoles.length },
        { status: 409 }
      );
    }
    
    // Parse optional locale from body
    const body = await request.json().catch(() => ({}));
    const locale = body.locale as string | undefined;
    
    // Snapshot roles
    const count = await ParticipantSessionService.snapshotGameRoles(
      sessionId,
      session.game_id,
      locale
    );
    
    return NextResponse.json({
      success: true,
      count,
      message: `${count} roller kopierade till sessionen`,
    });
    
  } catch (error) {
    console.error('Error snapshotting roles:', error);
    return NextResponse.json(
      { error: 'Failed to snapshot roles' },
      { status: 500 }
    );
  }
}
