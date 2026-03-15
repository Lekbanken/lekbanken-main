/**
 * POST /api/participants/sessions/join
 *
 * Join a participant session using a 6-character code.
 * No authentication required — anonymous participation.
 *
 * Batch 6c: Wrapped with apiHandler (auth: 'public', rateLimit: 'strict').
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { z } from 'zod';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import {
  generateParticipantToken,
  calculateTokenExpiry,
} from '@/lib/services/participants/participant-token';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { logger } from '@/lib/utils/logger';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';

const joinSchema = z.object({
  // Codes are 6 chars (e.g. "H3K9QF"), max 10 allows formatted input like "H3K-9QF"
  sessionCode: z.string().min(1, 'Session code is required').max(10),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name must be 50 characters or less').trim(),
  avatarUrl: z.string().url('Invalid avatar URL').max(2048).refine(
    url => /^https?:\/\//i.test(url),
    'Avatar URL must use HTTP or HTTPS'
  ).optional(),
});

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'strict',
  input: joinSchema,
  handler: async ({ req, body }) => {
    const { sessionCode, displayName, avatarUrl } = body;

    // Normalize and find session
    const normalizedCode = normalizeSessionCode(sessionCode);
    const session = await ParticipantSessionService.getSessionByCode(normalizedCode);

    if (!session) {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
      );
    }

    // Check session status — use uniform error to prevent enumeration
    if (session.status === 'draft') {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
      );
    }
    if (session.status === 'locked') {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
      );
    }
    if (session.status === 'ended' || session.status === 'cancelled' || session.status === 'archived') {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
      );
    }

    // Allow joining during: lobby (waiting), active (running), paused (temporarily stopped)
    if (session.status !== 'lobby' && session.status !== 'active' && session.status !== 'paused') {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
      );
    }

    // Check if session has expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Unable to join session', code: 'JOIN_FAILED' },
        { status: 404 },
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
        { error: 'Unable to join session', code: 'SESSION_FULL' },
        { status: 403 },
      );
    }

    const requireApproval = Boolean(settings.require_approval ?? settings.requireApproval);

    // Generate participant token
    const participantToken = generateParticipantToken();

    // Calculate token expiry based on session settings
    const tokenExpiryHours = (session.settings as { token_expiry_hours?: number | null }).token_expiry_hours ?? 24;
    const tokenExpiresAt = calculateTokenExpiry(tokenExpiryHours);

    // Get client IP for security/moderation
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create participant
    const supabase = createServiceRoleClient();
    const { data: participant, error: createError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        display_name: displayName.trim(),
        participant_token: participantToken,
        avatar_url: avatarUrl,
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
        displayName,
      });
      return NextResponse.json(
        { error: 'Failed to join session' },
        { status: 500 },
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

    // Broadcast participants_changed so hosts get live count updates (MS9)
    void broadcastPlayEvent(session.id, {
      type: 'participants_changed',
      payload: { sessionId: session.id },
      timestamp: new Date().toISOString(),
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
        participantCount: session.participant_count + 1,
        settings: session.settings,
      },
    });
  },
});
