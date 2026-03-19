/**
 * Participant Game Progress API
 * 
 * POST /api/participants/progress/update
 * Updates or creates game progress for a participant
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { requireActiveParticipant } from '@/lib/api/play-auth';
import { assertSessionStatus } from '@/lib/play/session-guards';
import type { Database, Json } from '@/types/supabase';

interface UpdateProgressBody {
  game_id: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  max_score?: number;
  progress_percentage?: number;
  time_spent_seconds?: number;
  current_level?: number;
  current_checkpoint?: string;
  game_data?: Record<string, unknown>;
}

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant: p }) => {
    // BUG-083 FIX: idle participants must not update progress
    const activeGuard = requireActiveParticipant(p!.status);
    if (activeGuard) return activeGuard;

    let body: UpdateProgressBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { game_id, ...updates } = body;

    if (!game_id) {
      return NextResponse.json(
        { error: 'game_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get session to resolve tenant
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, tenant_id, status')
      .eq('id', p!.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found for participant' },
        { status: 404 }
      );
    }

    // BUG-084 FIX: reject progress writes after session ends
    const statusError = assertSessionStatus(session.status, 'progress-update');
    if (statusError) return statusError;

    // Check if game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, title')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from('participant_game_progress')
      .select('*')
      .eq('participant_id', p!.participantId)
      .eq('game_id', game_id)
      .single();

    const now = new Date().toISOString();
    let progressData: Database['public']['Tables']['participant_game_progress']['Row'];

    const { game_data, ...progressUpdates } = updates;
    const parsedGameData: Json | null = (game_data as Json) ?? null;

    if (existingProgress) {
      // Update existing progress
      const updateData: Database['public']['Tables']['participant_game_progress']['Update'] = {
        ...progressUpdates,
        game_data: parsedGameData,
        last_updated_at: now,
      };

      // If status changed to 'in_progress' and started_at is null, set it
      if (progressUpdates.status === 'in_progress' && !existingProgress.started_at) {
        updateData.started_at = now;
      }

      // If status changed to 'completed', set completed_at
      if (progressUpdates.status === 'completed' && !existingProgress.completed_at) {
        updateData.completed_at = now;
      }

      const { data: updated, error: updateError } = await supabase
        .from('participant_game_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating progress:', updateError);
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      progressData = updated;
    } else {
      // Create new progress record
      const insertData: Database['public']['Tables']['participant_game_progress']['Insert'] = {
        tenant_id: session.tenant_id,
        session_id: p!.sessionId,
        participant_id: p!.participantId,
        game_id,
        ...progressUpdates,
        game_data: parsedGameData,
        last_updated_at: now,
        started_at: progressUpdates.status === 'in_progress' ? now : null,
        completed_at: progressUpdates.status === 'completed' ? now : null,
      };

      const { data: created, error: insertError } = await supabase
        .from('participant_game_progress')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating progress:', insertError);
        return NextResponse.json(
          { error: 'Failed to create progress record' },
          { status: 500 }
        );
      }

      progressData = created;
    }

    // Broadcast progress update to session channel
    const channel = supabase.channel(`session:${p!.sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'progress_updated',
      payload: {
        participant_id: p!.participantId,
        game_id,
        status: progressData.status,
        score: progressData.score,
        progress_percentage: progressData.progress_percentage,
        timestamp: now,
      },
    });

    // Log activity
    await supabase.from('participant_activity_log').insert({
      session_id: p!.sessionId,
      participant_id: p!.participantId,
      event_type: 'progress_update',
      event_data: {
        game_id,
        status: progressData.status,
        score: progressData.score,
        progress_percentage: progressData.progress_percentage,
      } as Json,
    });

    return NextResponse.json({
      success: true,
      progress: progressData,
      message: 'Progress updated successfully',
    });
  },
});
