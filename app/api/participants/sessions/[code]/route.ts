/**
 * GET /api/participants/sessions/[code]
 * 
 * Get session information by session code.
 * Public endpoint - used to check if a session exists before joining.
 */

import { NextResponse } from 'next/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    
    // Normalize code
    const normalizedCode = normalizeSessionCode(code);
    
    // Get session
    const session = await ParticipantSessionService.getSessionByCode(normalizedCode);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Only return public information
    return NextResponse.json({
      success: true,
      session: {
        sessionCode: session.session_code,
        displayName: session.display_name,
        description: session.description,
        status: session.status,
        participantCount: session.participant_count,
        maxParticipants: (session.settings as { max_participants?: number }).max_participants,
        expiresAt: session.expires_at,
        // Don't expose: tenant_id, host_user_id, internal settings
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
