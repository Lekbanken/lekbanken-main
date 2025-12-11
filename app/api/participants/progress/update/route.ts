/**
 * Participant Game Progress API
 * 
 * POST /api/participants/progress/update
 * Updates or creates game progress for a participant
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';

interface UpdateProgressRequest {
  participant_token: string;
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

export async function POST(request: NextRequest) {
  try {
    const body: UpdateProgressRequest = await request.json();
    const { participant_token, game_id, ...updates } = body;

    if (!participant_token || !game_id) {
      return NextResponse.json(
        { error: 'participant_token and game_id are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get participant by token
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id, status')
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Invalid participant token' },
        { status: 401 }
      );
    }

    // Check participant status
    if (participant.status === 'blocked' || participant.status === 'kicked') {
      return NextResponse.json(
        { error: 'Participant is blocked or kicked' },
        { status: 403 }
      );
    }

    // Get session to resolve tenant
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, tenant_id')
      .eq('id', participant.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found for participant' },
        { status: 404 }
      );
    }

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
      .eq('participant_id', participant.id)
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
        session_id: participant.session_id,
        participant_id: participant.id,
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
    const channel = supabase.channel(`session:${participant.session_id}`);
    await channel.send({
      type: 'broadcast',
      event: 'progress_updated',
      payload: {
        participant_id: participant.id,
        game_id,
        status: progressData.status,
        score: progressData.score,
        progress_percentage: progressData.progress_percentage,
        timestamp: now,
      },
    });

    // Log activity
    await supabase.from('participant_activity_log').insert({
      session_id: participant.session_id,
      participant_id: participant.id,
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

  } catch (error) {
    console.error('Error in progress update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
