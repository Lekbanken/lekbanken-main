/**
 * Rejoin Session API
 *
 * POST /api/participants/sessions/rejoin
 *
 * Validates stored token and restores participant state.
 * Allows participants to reconnect after disconnect/refresh.
 *
 * Batch 6c: Wrapped with apiHandler (auth: 'public', rateLimit: 'api').
 * Bug fix: Added rate limiting (was previously missing — brute-force risk).
 * Bug fix: Invalid token now returns 401 instead of 404 (enumeration protection).
 * Bug fix: Removed `await` on sync `createServiceRoleClient()`.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { ApiError } from '@/lib/api/errors';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';
import { z } from 'zod';

const rejoinSchema = z.object({
  participantToken: z.string().uuid('Invalid participant token format'),
  sessionId: z.string().uuid('Invalid session ID format'),
});

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'api',
  input: rejoinSchema,
  handler: async ({ req, body }) => {
    const supabase = createServiceRoleClient();

    const { participantToken, sessionId } = body;

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
      // 401 instead of 404 — prevents token enumeration (DD-2)
      throw new ApiError(401, 'Invalid or expired participant token');
    }

    // Check if participant is blocked or kicked
    if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
      return NextResponse.json(
        { error: 'You have been removed from this session' },
        { status: 403 },
      );
    }

    // Check session status
    const session = Array.isArray(participant.session)
      ? participant.session[0]
      : participant.session;

    if (session.status === 'draft') {
      return NextResponse.json(
        { error: 'Session is not open for participants yet' },
        { status: 403 },
      );
    }

    if (session.status === 'ended' || session.status === 'cancelled' || session.status === 'archived') {
      return NextResponse.json(
        { error: 'This session has ended' },
        { status: 410 },
      );
    }

    // Check if token has expired
    if (participant.token_expires_at) {
      const expiresAt = new Date(participant.token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Your token has expired. Please rejoin with a new code.' },
          { status: 401 },
        );
      }
    }

    const requireApproval = Boolean(
      (session.settings as { require_approval?: boolean; requireApproval?: boolean } | null)?.require_approval ??
      (session.settings as { require_approval?: boolean; requireApproval?: boolean } | null)?.requireApproval,
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
          { status: 500 },
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
          ip_address: req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
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
  },
});
