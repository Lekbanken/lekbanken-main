/**
 * GET /api/play/me/role
 *
 * Returns the current participant's assigned session role (if any).
 * Requires x-participant-token + session_code.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { apiHandler } from '@/lib/api/route-handler';

export const GET = apiHandler({
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

    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, secret_instructions_unlocked_at')
      .eq('session_code', normalizedCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify participant belongs to this session
    if (p!.sessionId !== session.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
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
      .eq('participant_id', p!.participantId)
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

      // BUG-047 FIX: Mask private_instructions and private_hints until BOTH gates pass:
      // 1. Host has unlocked secrets (session.secret_instructions_unlocked_at is set)
      // 2. Participant has revealed their secrets (assignment.secret_instructions_revealed_at is set)
      const hostUnlocked = !!(session as Record<string, unknown>).secret_instructions_unlocked_at;
      const participantRevealed = !!(assignment as unknown as Record<string, unknown>)?.secret_instructions_revealed_at;
      if (!hostUnlocked || !participantRevealed) {
        delete (role as Record<string, unknown>)['private_instructions'];
        delete (role as Record<string, unknown>)['private_hints'];
      }
    }

    return NextResponse.json({
      role,
      revealedAt: (assignment as unknown as { revealed_at: string | null } | null)?.revealed_at ?? null,
      secretRevealedAt:
        (assignment as unknown as Record<string, unknown> | null)?.secret_instructions_revealed_at ?? null,
    });
  },
});
