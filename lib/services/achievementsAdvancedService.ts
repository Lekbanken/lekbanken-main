/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase/server';

// Types
export interface CommunityChallenge {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  difficulty: string;
  target_value: number;
  reward_points: number;
  reward_currency_amount: number | null;
  status: string;
  starts_at: string;
  ends_at: string;
  participation_count: number;
  completion_count: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipation {
  id: string;
  tenant_id: string;
  challenge_id: string;
  user_id: string;
  progress_value: number;
  completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LimitedTimeEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_type: string;
  theme: string | null;
  reward_type: string;
  reward_amount: number;
  starts_at: string;
  ends_at: string;
  participant_count: number;
  completion_count: number;
  status: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventReward {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string;
  reward_id: string;
  reward_name: string;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
}

export interface SeasonalAchievement {
  id: string;
  tenant_id: string;
  season_name: string;
  season_number: number;
  achievement_id: string;
  rarity: string;
  exclusive_to_season: boolean;
  reward_bonus_percent: number;
  released_at: string;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

// Community Challenges
export async function getActiveChallenges(
  tenantId: string,
  limit: number = 20
): Promise<CommunityChallenge[] | null> {
  try {
    const query = supabaseAdmin.from('community_challenges' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching challenges:', error);
      return null;
    }

    return (data as CommunityChallenge[]) || [];
  } catch (err) {
    console.error('Error fetching challenges:', err);
    return null;
  }
}

export async function createChallenge(
  tenantId: string,
  userId: string,
  challenge: Omit<CommunityChallenge, 'id' | 'tenant_id' | 'participation_count' | 'completion_count' | 'created_by_user_id' | 'created_at' | 'updated_at'>
): Promise<CommunityChallenge | null> {
  try {
    const query = supabaseAdmin.from('community_challenges' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        created_by_user_id: userId,
        ...challenge,
        participation_count: 0,
        completion_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating challenge:', error);
      return null;
    }

    return data as CommunityChallenge;
  } catch (err) {
    console.error('Error creating challenge:', err);
    return null;
  }
}

export async function joinChallenge(
  tenantId: string,
  userId: string,
  challengeId: string
): Promise<ChallengeParticipation | null> {
  try {
    const query = supabaseAdmin.from('challenge_participation' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        challenge_id: challengeId,
        progress_value: 0,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining challenge:', error);
      return null;
    }

    return data as ChallengeParticipation;
  } catch (err) {
    console.error('Error joining challenge:', err);
    return null;
  }
}

export async function updateChallengeProgress(
  participationId: string,
  progressValue: number
): Promise<ChallengeParticipation | null> {
  try {
    const query = supabaseAdmin.from('challenge_participation' as any) as any;
    const { data, error } = await query
      .update({
        progress_value: progressValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', participationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return null;
    }

    return data as ChallengeParticipation;
  } catch (err) {
    console.error('Error updating progress:', err);
    return null;
  }
}

// Limited-Time Events
export async function getActiveEvents(
  tenantId: string,
  limit: number = 10
): Promise<LimitedTimeEvent[] | null> {
  try {
    const query = supabaseAdmin.from('limited_time_events' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching events:', error);
      return null;
    }

    return (data as LimitedTimeEvent[]) || [];
  } catch (err) {
    console.error('Error fetching events:', err);
    return null;
  }
}

export async function createEvent(
  tenantId: string,
  userId: string,
  event: Omit<LimitedTimeEvent, 'id' | 'tenant_id' | 'participant_count' | 'completion_count' | 'created_by_user_id' | 'created_at' | 'updated_at'>
): Promise<LimitedTimeEvent | null> {
  try {
    const query = supabaseAdmin.from('limited_time_events' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        created_by_user_id: userId,
        ...event,
        participant_count: 0,
        completion_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return null;
    }

    return data as LimitedTimeEvent;
  } catch (err) {
    console.error('Error creating event:', err);
    return null;
  }
}

export async function getEventRewards(
  userId: string,
  tenantId: string,
  onlyClaimed: boolean = false
): Promise<EventReward[] | null> {
  try {
    const query = supabaseAdmin.from('event_rewards' as any) as any;
    let q = query
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (onlyClaimed) q = q.eq('claimed', true);

    const { data, error } = await q.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event rewards:', error);
      return null;
    }

    return (data as EventReward[]) || [];
  } catch (err) {
    console.error('Error fetching event rewards:', err);
    return null;
  }
}

export async function claimEventReward(rewardId: string): Promise<EventReward | null> {
  try {
    const query = supabaseAdmin.from('event_rewards' as any) as any;
    const { data, error } = await query
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .select()
      .single();

    if (error) {
      console.error('Error claiming reward:', error);
      return null;
    }

    return data as EventReward;
  } catch (err) {
    console.error('Error claiming reward:', err);
    return null;
  }
}

// Seasonal Achievements
export async function getSeasonalAchievements(
  tenantId: string,
  seasonNumber: number
): Promise<SeasonalAchievement[] | null> {
  try {
    const query = supabaseAdmin.from('seasonal_achievements' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('season_number', seasonNumber)
      .order('rarity', { ascending: false });

    if (error) {
      console.error('Error fetching seasonal achievements:', error);
      return null;
    }

    return (data as SeasonalAchievement[]) || [];
  } catch (err) {
    console.error('Error fetching seasonal achievements:', err);
    return null;
  }
}

export async function createSeasonalAchievement(
  tenantId: string,
  achievement: Omit<SeasonalAchievement, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<SeasonalAchievement | null> {
  try {
    const query = supabaseAdmin.from('seasonal_achievements' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        ...achievement,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating seasonal achievement:', error);
      return null;
    }

    return data as SeasonalAchievement;
  } catch (err) {
    console.error('Error creating seasonal achievement:', err);
    return null;
  }
}

// Achievement Leaderboard
export async function getAchievementLeaderboard(
  tenantId: string,
  seasonNumber?: number,
  limit: number = 50
): Promise<any[] | null> {
  try {
    const query = supabaseAdmin.from('achievement_leaderboards' as any) as any;
    let q = query
      .select('*, users(id, full_name)')
      .eq('tenant_id', tenantId);

    if (seasonNumber) q = q.eq('season_number', seasonNumber);

    q = q.order('achievement_count', { ascending: false }).limit(limit);

    const { data, error } = await q;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return null;
  }
}

export async function updateAchievementStats(
  tenantId: string,
  userId: string,
  seasonNumber: number,
  stats: {
    achievement_count?: number;
    seasonal_achievement_count?: number;
    total_achievement_points?: number;
  }
): Promise<boolean> {
  try {
    const query = supabaseAdmin.from('achievement_leaderboards' as any) as any;
    const { error } = await query
      .update({
        ...stats,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('season_number', seasonNumber);

    if (error) {
      console.error('Error updating stats:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating stats:', err);
    return false;
  }
}
