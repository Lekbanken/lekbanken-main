/**
 * POST /api/play/me/role/reveal
 *
 * Marks that the current participant has revealed their secret role instructions.
 * Requires x-participant-token + session_code.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-participant-token');
    const url = new URL(request.url);
    const sessionCode = url.searchParams.get('session_code');

    if (!token || !sessionCode) {
      return NextResponse.json(
        { error: 'Missing participant token or session_code' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeSessionCode(sessionCode);
    const supabase = await createServiceRoleClient();

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

    if (!(session as Record<string, unknown>)?.secret_instructions_unlocked_at) {
      return NextResponse.json(
        { error: 'Secret instructions are not unlocked' },
        { status: 409 }
      );
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, token_expires_at, status')
      .eq('participant_token', token)
      .eq('session_id', sessionId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (participant.status === 'blocked' || participant.status === 'kicked') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('participant_role_assignments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('participant_id', participant.id)
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
  } catch (error) {
    console.error('[me/role/reveal] error:', error);
    return NextResponse.json(
      { error: 'Failed to reveal secret instructions' },
      { status: 500 }
    );
  }
}
