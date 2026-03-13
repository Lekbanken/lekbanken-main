/**
 * POST /api/play/me/role/reveal
 *
 * Marks that the current participant has revealed their secret role instructions.
 * Requires x-participant-token + session_code.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { apiHandler } from '@/lib/api/route-handler';
import { assertSessionStatus } from '@/lib/play/session-guards';

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant: p }) => {
    const url = new URL(req.url);
    const sessionCode = url.searchParams.get('session_code');

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Missing session_code' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeSessionCode(sessionCode);
    const supabase = createServiceRoleClient();

    // Note: keep select('*') so it compiles even if generated Supabase types lag behind migrations.
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('*')
      .eq('session_code', normalizedCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionId = String((session as Record<string, unknown>).id);

    const statusError = assertSessionStatus(
      String((session as Record<string, unknown>).status),
      'role-reveal',
    );
    if (statusError) return statusError;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    if (!(session as Record<string, unknown>)?.secret_instructions_unlocked_at) {
      return NextResponse.json(
        { error: 'Secret instructions are not unlocked' },
        { status: 409 }
      );
    }

    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('participant_role_assignments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('participant_id', p!.participantId)
      .maybeSingle();

    if (assignmentError) {
      console.error('[me/role/reveal] assignment fetch error:', assignmentError);
      return NextResponse.json({ error: 'Failed to load role assignment' }, { status: 500 });
    }

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'No role assignment found for participant' },
        { status: 409 }
      );
    }

    const existingRevealedAt =
      (existingAssignment as unknown as Record<string, unknown>)?.secret_instructions_revealed_at ?? null;

    if (existingRevealedAt) {
      return NextResponse.json(
        { success: true, secretRevealedAt: existingRevealedAt },
        { status: 200 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('participant_role_assignments')
      .update({
        secret_instructions_revealed_at: now,
      } as Record<string, unknown>)
      .eq('id', (existingAssignment as unknown as Record<string, unknown>).id as string);

    if (updateError) {
      console.error('[me/role/reveal] update error:', updateError);
      return NextResponse.json({ error: 'Failed to mark revealed' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, secretRevealedAt: now },
      { status: 200 }
    );
  },
});
