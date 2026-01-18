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
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter';
import { errorTracker } from '@/lib/utils/error-tracker';

interface JoinSessionRequest {
  sessionCode: string;
  displayName: string;
  avatarUrl?: string;
}

export async function POST(request: NextRequest) {
  // Apply strict rate limiting for join endpoint (prevent abuse)
  const rateLimitResponse = applyRateLimitMiddleware(request, 'strict');
  if (rateLimitResponse) return rateLimitResponse;

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
    if (session.status === 'locked') {
      return NextResponse.json(
        { error: 'Session is locked', details: 'Session is locked. No new participants can join.' },
        { status: 403 }
      );
    }

    if (session.status === 'ended' || session.status === 'cancelled' || session.status === 'archived') {
      return NextResponse.json(
        { error: 'Session ended', details: 'Session has ended.' },
        { status: 410 }
      );
    }

    if (session.status !== 'active' && session.status !== 'paused') {
      return NextResponse.json(
        { 
          error: 'Session not available',
          details: `Session is ${session.status}.`,
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
    const settings = session.settings as {
      max_participants?: number;
      maxParticipants?: number;
      require_approval?: boolean;
      requireApproval?: boolean;
    };
    const maxParticipants = settings.max_participants ?? settings.maxParticipants;
    if (maxParticipants && session.participant_count >= maxParticipants) {
      return NextResponse.json(
        { error: 'Session is full', details: `Maximum ${maxParticipants} participants reached` },
        { status: 403 }
      );
    }

    const requireApproval = Boolean(settings.require_approval ?? settings.requireApproval);
    
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
        // NOTE: DB enum does not include 'pending' (use 'idle' to represent awaiting approval)
        status: requireApproval ? 'idle' : 'active',
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
        status: participant.status,
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
    // Track error to Supabase error_tracking table
    await errorTracker.api(
      '/api/participants/sessions/join',
      'POST',
      error
    );
    
    return NextResponse.json(
      { error: 'Failed to join session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
