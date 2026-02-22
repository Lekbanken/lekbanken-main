/**
 * Secret Instructions API
 *
 * GET: Returns secret unlock status + basic stats
 * POST: { action: 'unlock' | 'relock' }
 *
 * Host-only endpoint.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';

type SecretsAction = 'unlock' | 'relock';

async function getSecretsStats(sessionId: string) {
  const supabase = await createServiceRoleClient();

  const { count: participantCount } = await supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { count: assignedCount } = await supabase
    .from('participant_role_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { count: revealedCount } = await supabase
    .from('participant_role_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .not('secret_instructions_revealed_at', 'is', null);

  return {
    participant_count: participantCount ?? 0,
    assigned_count: assignedCount ?? 0,
    revealed_count: revealedCount ?? 0,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createServerRlsClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: counts } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const { data: assignedCounts } = await supabase
      .from('participant_role_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const { data: revealedCounts } = await supabase
      .from('participant_role_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .not('secret_instructions_revealed_at', 'is', null);

    return NextResponse.json({
      session: {
        id: sessionId,
        secret_instructions_unlocked_at: (session as Record<string, unknown>).secret_instructions_unlocked_at ?? null,
        secret_instructions_unlocked_by: (session as Record<string, unknown>).secret_instructions_unlocked_by ?? null,
      },
      stats: {
        participant_count: (counts as unknown as { count?: number })?.count ?? 0,
        assigned_count: (assignedCounts as unknown as { count?: number })?.count ?? 0,
        revealed_count: (revealedCounts as unknown as { count?: number })?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('[secrets] GET failed:', error);
    return NextResponse.json({ error: 'Failed to get secret instruction status' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createServerRlsClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { action?: SecretsAction };
    const action = body.action;
    if (action !== 'unlock' && action !== 'relock') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'unlock') {
      // Enforce that roles are assigned before unlocking.
      const participantsRes = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      const assignmentsRes = await supabase
        .from('participant_role_assignments')
        .select('participant_id', { count: 'exact', head: false })
        .eq('session_id', sessionId);

      const participantCount = participantsRes.count ?? 0;
      const uniqueAssigned = new Set((assignmentsRes.data ?? []).map((r) => (r as { participant_id: string }).participant_id));
      const assignedCount = uniqueAssigned.size;

      if (participantCount > 0 && assignedCount < participantCount) {
        return NextResponse.json({
          error: 'Roles must be assigned before unlocking secrets',
          stats: { participant_count: participantCount, assigned_count: assignedCount },
        }, { status: 409 });
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('participant_sessions')
        // Supabase generated types may not include freshly migrated columns yet.
        .update({
          secret_instructions_unlocked_at: now,
          secret_instructions_unlocked_by: user.id,
        } as Record<string, unknown>)
        .eq('id', sessionId);

      if (updateError) {
        console.error('[secrets] unlock update error:', updateError);
        return NextResponse.json({ error: 'Failed to unlock secrets' }, { status: 500 });
      }

      await broadcastPlayEvent(sessionId, {
        type: 'state_change',
        payload: {
          secret_instructions_unlocked_at: now,
          secret_instructions_unlocked_by: user.id,
        },
        timestamp: now,
      });

      await supabase.from('session_events').insert({
        session_id: sessionId,
        event_type: 'secret_instructions_unlocked',
        event_data: {},
        actor_user_id: user.id,
      });

      return NextResponse.json({
        success: true,
        session: {
          id: sessionId,
          secret_instructions_unlocked_at: now,
          secret_instructions_unlocked_by: user.id,
        },
        stats: await getSecretsStats(sessionId),
      });
    }

    // action === 'relock'
    const { count: revealedCount, error: revealedError } = await supabase
      .from('participant_role_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .not('secret_instructions_revealed_at', 'is', null);

    if (revealedError) {
      console.error('[secrets] relock revealed query error:', revealedError);
      return NextResponse.json({ error: 'Failed to validate relock safety' }, { status: 500 });
    }

    if ((revealedCount ?? 0) > 0) {
      return NextResponse.json({
        error: 'Cannot re-lock: at least one participant has already revealed secrets',
        revealed_count: revealedCount,
      }, { status: 409 });
    }

    const { error: relockError } = await supabase
      .from('participant_sessions')
      // Supabase generated types may not include freshly migrated columns yet.
      .update({
        secret_instructions_unlocked_at: null,
        secret_instructions_unlocked_by: null,
      } as Record<string, unknown>)
      .eq('id', sessionId);

    if (relockError) {
      console.error('[secrets] relock update error:', relockError);
      return NextResponse.json({ error: 'Failed to re-lock secrets' }, { status: 500 });
    }

    await broadcastPlayEvent(sessionId, {
      type: 'state_change',
      payload: {
        secret_instructions_unlocked_at: null,
        secret_instructions_unlocked_by: null,
      },
      timestamp: new Date().toISOString(),
    });

    await supabase.from('session_events').insert({
      session_id: sessionId,
      event_type: 'secret_instructions_relocked',
      event_data: {},
      actor_user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        secret_instructions_unlocked_at: null,
        secret_instructions_unlocked_by: null,
      },
      stats: await getSecretsStats(sessionId),
    });
  } catch (error) {
    console.error('[secrets] POST failed:', error);
    return NextResponse.json({ error: 'Failed to update secret instructions' }, { status: 500 });
  }
}
