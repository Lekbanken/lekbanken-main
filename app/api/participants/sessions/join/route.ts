/**
 * POST /api/participants/sessions/join
 * 
 * Join a participant session using a 6-character code.
 * No authentication required - anonymous participation.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { 
  generateParticipantToken, 
  calculateTokenExpiry 
} from '@/lib/services/participants/participant-token';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { logger } from '@/lib/utils/logger';

interface JoinSessionRequest {
  sessionCode: string;
  displayName: string;
  avatarUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: JoinSessionRequest = await request.json();
    
    // Validate required fields
    if (!body.sessionCode || body.sessionCode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session code is required' },
        { status: 400 }
      );
    }
    
    if (!body.displayName || body.displayName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }
    
    if (body.displayName.length > 50) {
      return NextResponse.json(
        { error: 'Display name must be 50 characters or less' },
        { status: 400 }
      );
    }
    
    // Normalize and find session
    const normalizedCode = normalizeSessionCode(body.sessionCode);
    const session = await ParticipantSessionService.getSessionByCode(normalizedCode);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', details: 'Invalid session code or session has ended' },
        { status: 404 }
      );
    }
    
    // Check session status
    if (session.status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Session not available',
          details: `Session is ${session.status}. Only active sessions accept new participants.`,
        },
        { status: 403 }
      );
    }
    
    // Check if session has expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 } // Gone
      );
    }
    
    // Check max participants limit
    const settings = session.settings as { max_participants?: number };
    if (settings.max_participants && session.participant_count >= settings.max_participants) {
      return NextResponse.json(
        { error: 'Session is full', details: `Maximum ${settings.max_participants} participants reached` },
        { status: 403 }
      );
    }
    
    // Generate participant token
    const participantToken = generateParticipantToken();
    
    // Calculate token expiry based on session settings
    const tokenExpiryHours = (session.settings as { token_expiry_hours?: number | null }).token_expiry_hours ?? 24;
    const tokenExpiresAt = calculateTokenExpiry(tokenExpiryHours);
    
    // Get client IP for security/moderation
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create participant
    const supabase = await createServiceRoleClient();
    const { data: participant, error: createError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        display_name: body.displayName.trim(),
        participant_token: participantToken,
        avatar_url: body.avatarUrl,
        token_expires_at: tokenExpiresAt?.toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();
    
    if (createError || !participant) {
      logger.error('Failed to create participant', createError, {
        sessionId: session.id,
        displayName: body.displayName,
      });
      
      return NextResponse.json(
        { error: 'Failed to join session', details: createError?.message },
        { status: 500 }
      );
    }
    
    // Log activity
    await supabase
      .from('participant_activity_log')
      .insert({
        session_id: session.id,
        participant_id: participant.id,
        event_type: 'join',
        event_data: {
          display_name: participant.display_name,
          ip_address: ip,
        },
      });
    
    logger.info('Participant joined session', {
      sessionId: session.id,
      participantId: participant.id,
      displayName: participant.display_name,
    });
    
    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        sessionId: participant.session_id,
        displayName: participant.display_name,
        role: participant.role,
        token: participant.participant_token,
        expiresAt: participant.token_expires_at,
        joinedAt: participant.joined_at,
      },
      session: {
        id: session.id,
        displayName: session.display_name,
        description: session.description,
        participantCount: session.participant_count + 1, // Updated count
        settings: session.settings,
      },
    });
    
  } catch (error) {
    logger.error('Failed to process join request', error as Error, {
      endpoint: '/api/participants/sessions/join',
    });
    
    return NextResponse.json(
      { error: 'Failed to join session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
