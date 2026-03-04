/**
 * POST /api/play/sessions/[id]/command
 *
 * Unified command endpoint for all host session mutations.
 * Provides idempotency (client_id + client_seq) and audit logging.
 *
 * MS11 — Command Pipeline
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { Json } from '@/types/supabase';
import {
  applySessionCommand,
  SESSION_COMMAND_TYPES,
  type SessionCommandType,
} from '@/lib/play/session-command';

interface CommandRequestBody {
  command_type: SessionCommandType;
  payload?: Record<string, unknown>;
  client_id: string;
  client_seq: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // ── Auth ──────────────────────────────────────────────────
    const supabase = await createServerRlsClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Host or admin check ──────────────────────────────────
    const session = await ParticipantSessionService.getSessionById(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_user_id !== user.id) {
      // Allow system_admin override
      const { data: userData } = await supabase
        .from('users')
        .select('global_role')
        .eq('id', user.id)
        .single();

      if (userData?.global_role !== 'system_admin') {
        return NextResponse.json({ error: 'Not authorized to modify this session' }, { status: 403 });
      }
    }

    // ── Parse + validate body ────────────────────────────────
    const body: CommandRequestBody = await request.json();

    if (!body.command_type || !SESSION_COMMAND_TYPES.includes(body.command_type)) {
      return NextResponse.json(
        { error: `Invalid command_type. Valid types: ${SESSION_COMMAND_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.client_id || typeof body.client_id !== 'string') {
      return NextResponse.json({ error: 'client_id is required (string)' }, { status: 400 });
    }

    if (typeof body.client_seq !== 'number' || body.client_seq < 0) {
      return NextResponse.json({ error: 'client_seq is required (non-negative integer)' }, { status: 400 });
    }

    // ── Execute ──────────────────────────────────────────────
    const result = await applySessionCommand({
      sessionId,
      issuedBy: user.id,
      commandType: body.command_type,
      payload: (body.payload ?? {}) as Record<string, Json>,
      clientId: body.client_id,
      clientSeq: body.client_seq,
    });

    if (!result.success) {
      // State-machine guard or DB error — 409 for conflicts, 500 for others
      const status = result.error?.includes('Cannot ') ? 409 : 500;
      return NextResponse.json(
        { error: result.error, commandId: result.commandId },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      commandId: result.commandId,
      duplicate: result.duplicate ?? false,
      state: result.state ?? null,
    });
  } catch (err) {
    console.error('[command route] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
