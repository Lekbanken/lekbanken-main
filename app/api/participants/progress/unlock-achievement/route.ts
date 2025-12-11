/**
 * Participant Achievement Unlock API
 * 
 * POST /api/participants/progress/unlock-achievement
 * Records achievement unlock for a participant
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/supabase';

interface UnlockAchievementRequest {
  participant_token: string;
  achievement_id: string;
  game_id?: string;
  unlock_context?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: UnlockAchievementRequest = await request.json();
    const { participant_token, achievement_id, game_id, unlock_context } = body;

    if (!participant_token || !achievement_id) {
      return NextResponse.json(
        { error: 'participant_token and achievement_id are required' },
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

    // Get achievement details
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('id, name')
      .eq('id', achievement_id)
      .single();

    if (achievementError || !achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    const achievementPoints = 0;
    const achievementRarity: Database['public']['Tables']['participant_achievement_unlocks']['Insert']['rarity'] = null;
    const unlockContext: Json | null = (unlock_context as Json) ?? null;

    // Check if already unlocked
    const { data: existingUnlock } = await supabase
      .from('participant_achievement_unlocks')
      .select('id')
      .eq('participant_id', participant.id)
      .eq('achievement_id', achievement_id)
      .single();

    if (existingUnlock) {
      return NextResponse.json(
        { error: 'Achievement already unlocked', already_unlocked: true },
        { status: 409 }
      );
    }

    // Get game progress ID if game_id provided
    let gameProgressId = null;
    if (game_id) {
      const { data: gameProgress } = await supabase
        .from('participant_game_progress')
        .select('id')
        .eq('participant_id', participant.id)
        .eq('game_id', game_id)
        .single();

      gameProgressId = gameProgress?.id || null;
    }

    // Create unlock record
    const unlockInsert: Database['public']['Tables']['participant_achievement_unlocks']['Insert'] = {
      tenant_id: session.tenant_id,
      session_id: participant.session_id,
      participant_id: participant.id,
      game_progress_id: gameProgressId,
      achievement_id,
      achievement_name: achievement.name,
      achievement_points: achievementPoints,
      rarity: achievementRarity,
      unlock_context: unlockContext,
    };

    const { data: unlock, error: unlockError } = await supabase
      .from('participant_achievement_unlocks')
      .insert(unlockInsert)
      .select()
      .single();

    if (unlockError) {
      console.error('Error creating unlock:', unlockError);
      return NextResponse.json(
        { error: 'Failed to record achievement unlock' },
        { status: 500 }
      );
    }

    // Update game progress if applicable
    if (gameProgressId) {
      // Fetch current achievements_unlocked array
      const { data: currentProgress } = await supabase
        .from('participant_game_progress')
        .select('achievements_unlocked, achievement_count')
        .eq('id', gameProgressId)
        .single();

      if (currentProgress) {
        const updatedAchievements = [
          ...(currentProgress.achievements_unlocked || []),
          achievement_id,
        ];

        await supabase
          .from('participant_game_progress')
          .update({
            achievements_unlocked: updatedAchievements,
            achievement_count: updatedAchievements.length,
          })
          .eq('id', gameProgressId);
      }
    }

    // Broadcast achievement unlock to session
    const channel = supabase.channel(`session:${participant.session_id}`);
    await channel.send({
      type: 'broadcast',
      event: 'achievement_unlocked',
      payload: {
        participant_id: participant.id,
        achievement_id,
        achievement_name: achievement.name,
        points: achievementPoints,
        rarity: achievementRarity,
        timestamp: new Date().toISOString(),
      },
    });

    // Log activity
    await supabase.from('participant_activity_log').insert({
      session_id: participant.session_id,
      participant_id: participant.id,
      event_type: 'achievement_unlock',
      event_data: {
        achievement_id,
        achievement_name: achievement.name,
        points: achievementPoints,
        context: unlock_context ?? null,
      } as Json,
    });

    return NextResponse.json({
      success: true,
      unlock,
      achievement: {
        id: achievement.id,
        name: achievement.name,
        points: achievementPoints,
        rarity: achievementRarity,
      },
      message: 'Achievement unlocked successfully',
    });

  } catch (error) {
    console.error('Error in achievement unlock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
