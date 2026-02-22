/**
 * GET /api/play/me/role
 *
 * Returns the current participant's assigned session role (if any).
 * Requires x-participant-token + session_code.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';

export async function GET(request: Request) {
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

    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id')
      .eq('session_code', normalizedCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, token_expires_at, status')
      .eq('participant_token', token)
      .eq('session_id', session.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    // SECURITY: Select only participant-safe role fields.
    // Never expose assignment_strategy, scaling_rules, conflicts_with,
    // min_count, max_count, or other game-design metadata to participants.
    const { data: assignment } = await supabase
      .from('participant_role_assignments')
      .select(
        `
        revealed_at,
        secret_instructions_revealed_at,
        session_role:session_roles(
          id,
          name,
          icon,
          color,
          public_description,
          private_instructions,
          private_hints
        )
      `
      )
      .eq('session_id', session.id)
      .eq('participant_id', participant.id)
      .limit(1)
      .maybeSingle();

    const role = (assignment as unknown as { session_role: unknown } | null)?.session_role ?? null;

    // SECURITY TRIPWIRE: hard-strip + log in ALL environments.
    // Even if the SELECT above changes, participants never see design-meta.
    if (role && typeof role === 'object') {
      const FORBIDDEN_ROLE_KEYS = [
        'assignment_strategy', 'scaling_rules', 'conflicts_with',
        'min_count', 'max_count', 'preferred_count',
        'source_game_role_id', 'created_at', 'updated_at',
      ];
      for (const field of FORBIDDEN_ROLE_KEYS) {
        if (field in (role as Record<string, unknown>)) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[SECURITY] Role response contains forbidden field — stripping: ${field}`);
          }
          delete (role as Record<string, unknown>)[field];
        }
      }
    }

    return NextResponse.json({
      role,
      revealedAt: (assignment as unknown as { revealed_at: string | null } | null)?.revealed_at ?? null,
      secretRevealedAt:
        (assignment as unknown as Record<string, unknown> | null)?.secret_instructions_revealed_at ?? null,
    });
  } catch (error) {
    console.error('Error fetching participant role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participant role' },
      { status: 500 }
    );
  }
}
